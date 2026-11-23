"""Starting conversations, posting messages, and who may read them.

Access is checked on the server for every read and every post. Listing
filters in the database, with one query, never by loading every
conversation and checking each, which is the fault the plan names in
Quill Medical's messaging.
"""

from django.db import transaction
from django.db.models import Count, F, OuterRef, Q, QuerySet, Subquery
from django.db.models.functions import Coalesce, Greatest

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.cards.models import Card
from app.conversations.live import announce, hold_post_lock
from app.conversations.models import (
    Conversation,
    ConversationKind,
    Message,
    Participant,
    ReadPoint,
)
from app.push.services import notify_about
from app.spaces.models import Space
from app.spaces.services import is_in

#: The longest message, in characters. Far longer than any chat message,
#: short enough that one cannot fill the database.
MAX_MESSAGE_LENGTH = 10_000


class ConversationRefused(Exception):
    """A conversation or a message that is not allowed, with the reason."""


def conversations_for(user: User, space: Space) -> QuerySet[Conversation]:
    """The conversations in *space* that *user* may read, oldest first.

    Every channel, and the direct conversations they are part of. Nothing,
    if they are not in the space.
    """
    if not is_in(user, space):
        return Conversation.objects.none()

    return (
        Conversation.objects.filter(space=space)
        .filter(Q(kind=ConversationKind.CHANNEL) | Q(participants__user=user))
        .distinct()
        .prefetch_related("participants__user")
        .order_by("created_at", "pk")
    )


def all_conversations_for(user: User) -> QuerySet[Conversation]:
    """Every conversation *user* may read, across all their spaces.

    The rule of ``can_read``, in the database: a space they are in today,
    and a channel or a direct conversation they take part in. The most
    recently active comes first, by its newest message or newest living
    card, or by when it was started if it has neither. A card changing in
    place does not move it: only a new card does, as only a new card counts
    as unread. Nothing, for a closed account.
    """
    if not user.is_active:
        return Conversation.objects.none()

    newest_message = (
        Message.objects.filter(conversation=OuterRef("pk"))
        .order_by("-pk")
        .values("created_at")[:1]
    )
    newest_card = (
        Card.objects.filter(conversation=OuterRef("pk"))
        .order_by("-pk")
        .values("created_at")[:1]
    )
    readable = Conversation.objects.filter(
        Q(space__memberships__user=user)
        & Q(space__memberships__left_at__isnull=True)
        & (Q(kind=ConversationKind.CHANNEL) | Q(participants__user=user))
    ).values("pk")

    return (
        Conversation.objects.filter(pk__in=readable)
        .select_related("space")
        .prefetch_related("participants__user")
        # Postgres's GREATEST passes over a NULL, which is what a
        # conversation with no messages or no cards has.
        .annotate(
            last_active_at=Greatest(
                Subquery(newest_message),
                Subquery(newest_card),
                F("created_at"),
            )
        )
        .order_by("-last_active_at", "-pk")
    )


def unread_counts(user: User, conversation_ids: list[int]) -> dict[int, int]:
    """How many messages and new cards *user* has not read, in each
    conversation named.

    Two queries for all of them, whatever their number. Messages by somebody
    else newer than the person's read point in that conversation, or every
    one if they have none; replies in threads count too. And living cards
    made since the newest card they have seen: a card counts once, when it
    is made, and never again as it changes. A conversation with none unread
    is left out of the answer.
    """
    read_to = ReadPoint.objects.filter(
        user=user, conversation_id=OuterRef("conversation_id")
    )

    messages = (
        Message.objects.filter(conversation_id__in=conversation_ids)
        .exclude(author=user)
        .annotate(
            read_to=Coalesce(
                Subquery(read_to.values("last_read_message_id")[:1]), 0
            )
        )
        .filter(id__gt=F("read_to"))
        .values("conversation_id")
        .annotate(unread=Count("id"))
    )
    cards = (
        Card.objects.filter(conversation_id__in=conversation_ids)
        .annotate(
            read_to=Coalesce(
                Subquery(read_to.values("last_read_card_id")[:1]), 0
            )
        )
        .filter(id__gt=F("read_to"))
        .values("conversation_id")
        .annotate(unread=Count("id"))
    )

    found: dict[int, int] = {}

    for row in [*messages, *cards]:
        conversation_id = row["conversation_id"]
        found[conversation_id] = found.get(conversation_id, 0) + row["unread"]

    return found


def mark_read(
    user: User,
    conversation: Conversation,
    *,
    message_id: int | None = None,
    card_id: int | None = None,
) -> None:
    """Move *user*'s read point in *conversation* up to *message_id*, and
    up to *card_id*, whichever are given.

    Never back: reading an older message on a second device leaves the
    point where it was. A message or card from another conversation is
    ignored.
    """
    moved: list[str] = []
    point, _ = ReadPoint.objects.get_or_create(
        user=user, conversation=conversation
    )

    if (
        message_id is not None
        and message_id > point.last_read_message_id
        and conversation.messages.filter(pk=message_id).exists()
    ):
        point.last_read_message_id = message_id
        moved.append("last_read_message_id")

    if (
        card_id is not None
        and card_id > point.last_read_card_id
        and conversation.cards.filter(pk=card_id).exists()
    ):
        point.last_read_card_id = card_id
        moved.append("last_read_card_id")

    if moved:
        point.save(update_fields=[*moved, "updated_at"])


class ShowsPeopleRefused(Exception):
    """A direct conversation always shows its people."""


@transaction.atomic
def set_shows_people(
    conversation: Conversation, shows_people: bool, *, by: User
) -> None:
    """Show or hide a channel's people on Home, for everybody, audited.

    The caller has already checked *by* is an organisation admin.

    Raises:
        ShowsPeopleRefused: For a direct conversation.
    """
    if conversation.kind != ConversationKind.CHANNEL:
        raise ShowsPeopleRefused(
            "A direct conversation always shows its people."
        )

    conversation.shows_people = shows_people
    conversation.save(update_fields=["shows_people"])

    record(
        AuditAction.CONVERSATION_SHOWS_PEOPLE_CHANGED,
        actor=by,
        detail={"conversation": conversation.pk, "shows_people": shows_people},
    )


def can_read(user: User, conversation: Conversation) -> bool:
    """Whether *user* may read, and post in, *conversation* now."""
    if not is_in(user, conversation.space):
        return False

    if conversation.kind == ConversationKind.CHANNEL:
        return True

    return conversation.participants.filter(user=user).exists()


@transaction.atomic
def start_channel(space: Space, name: str, *, by: User) -> Conversation:
    """Open a channel in *space*, for everybody in it."""
    channel = Conversation.objects.create(
        space=space, kind=ConversationKind.CHANNEL, name=name, created_by=by
    )

    record(
        AuditAction.CONVERSATION_STARTED,
        actor=by,
        detail={"conversation": channel.pk, "kind": "channel"},
    )

    return channel


@transaction.atomic
def start_direct(
    space: Space, people: list[User], *, by: User
) -> Conversation:
    """Open a direct conversation between *by* and *people*, in *space*.

    Raises:
        ConversationRefused: If anybody named is not in the space, or
            nobody else is named.
    """
    everyone = {person.pk: person for person in [by, *people]}
    if len(everyone) < 2:
        raise ConversationRefused("Name at least one other person.")

    outside = [p for p in everyone.values() if not is_in(p, space)]
    if outside:
        raise ConversationRefused("Everybody must be in the space.")

    direct = Conversation.objects.create(
        space=space, kind=ConversationKind.DIRECT, created_by=by
    )
    Participant.objects.bulk_create(
        Participant(conversation=direct, user=person)
        for person in everyone.values()
    )

    record(
        AuditAction.CONVERSATION_STARTED,
        actor=by,
        detail={"conversation": direct.pk, "kind": "direct"},
    )

    return direct


def messages_in(conversation: Conversation, limit: int = 200) -> list[Message]:
    """The latest *limit* top-level messages, oldest first.

    Replies in a thread are left out; each message carries ``reply_count``,
    counted in the same query.
    """
    latest = (
        conversation.messages.filter(thread__isnull=True)
        .select_related("author")
        .annotate(reply_count=Count("replies"))
        .order_by("-created_at", "-pk")[:limit]
    )

    return list(reversed(latest))


def replies_to(message: Message) -> list[Message]:
    """The replies in *message*'s thread, oldest first."""
    return list(
        message.replies.select_related("author").order_by("created_at", "pk")
    )


@transaction.atomic
def post(
    conversation: Conversation,
    body: str,
    *,
    by: User,
    amends: Message | None = None,
    thread: Message | None = None,
) -> Message:
    """Add a message, a reply in a thread, or a correction of either.

    A reply to a reply joins the first message's thread, so a thread is
    one level deep. A correction stays in the thread of the message it
    corrects.

    Raises:
        ConversationRefused: If *by* may not post here, the body is empty or
            too long, or the message amended is not their own in this
            conversation.
    """
    if not can_read(by, conversation):
        raise ConversationRefused("You are not in this conversation.")

    text = body.strip()
    if not text:
        raise ConversationRefused("A message needs some text.")

    if len(text) > MAX_MESSAGE_LENGTH:
        raise ConversationRefused("That message is too long.")

    if amends is not None and (
        amends.conversation_id != conversation.pk or amends.author_id != by.pk
    ):
        raise ConversationRefused(
            "You can only correct your own messages here."
        )

    if thread is not None and thread.conversation_id != conversation.pk:
        raise ConversationRefused("That thread is in another conversation.")

    if amends is not None:
        thread = amends.thread
    elif thread is not None and thread.thread is not None:
        thread = thread.thread

    # Ids then commit in the order they are given, which live delivery's
    # "everything after the last id" relies on.
    hold_post_lock()
    message = Message.objects.create(
        conversation=conversation,
        author=by,
        body=text,
        amends=amends,
        thread=thread,
    )

    # The entry says a message was posted, and where; never what it said.
    record(
        AuditAction.MESSAGE_POSTED,
        actor=by,
        detail={"conversation": conversation.pk, "message": message.pk},
    )
    announce(conversation.pk)
    notify_about(message)

    return message
