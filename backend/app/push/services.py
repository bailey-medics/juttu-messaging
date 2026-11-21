"""Storing subscriptions, and sending a push when a message arrives.

A push goes to everybody else who may read the message, from a background
thread once the message is committed, so a slow push service never holds
up posting. It names the conversation and who wrote, and links to the
conversation, but never carries the message's text: a push passes through
Google's, Apple's or Mozilla's servers on its way to the phone.
"""

import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q, QuerySet
from django.utils import timezone
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.cards.models import Card, CardEvent
from app.config import PushKeys
from app.conversations.models import Conversation, ConversationKind, Message
from app.push.mentions import mentioned
from app.push.models import (
    Looking,
    NotificationSetting,
    NotifyLevel,
    PushSubscription,
)
from app.spaces.services import members_of

logger = logging.getLogger(__name__)

#: How long a push service keeps a push for a phone that is off: twelve
#: hours, so one sent overnight still arrives in the morning.
TIME_TO_LIVE_SECONDS = 12 * 60 * 60

#: How long to wait for a push service to answer.
TIMEOUT_SECONDS = 10

#: How long a "looking at this conversation" mark lasts. The page renews it
#: every half minute while it is on screen.
LOOKING_SECONDS = 60

#: The answers a push service gives for a subscription that has gone.
GONE = frozenset({404, 410})


@dataclass(frozen=True)
class Push:
    """One notification, as the phone's service worker reads it."""

    title: str
    body: str
    url: str
    #: Pushes with the same tag replace each other on the phone, so a busy
    #: conversation shows one notification, not one for each message.
    tag: str

    def payload(self) -> str:
        return json.dumps(
            {
                "title": self.title,
                "body": self.body,
                "tag": self.tag,
                "data": {"url": self.url},
            }
        )


@transaction.atomic
def subscribe(
    user: User, endpoint: str, p256dh: str, auth: str
) -> PushSubscription:
    """Store *user*'s subscription, or bring an existing one up to date.

    The endpoint names one browser, so if somebody else had it, such as on a
    shared computer, it now belongs to *user*.
    """
    subscription, created = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={"user": user, "p256dh": p256dh, "auth": auth},
    )

    if created:
        record(
            AuditAction.PUSH_SUBSCRIBED,
            actor=user,
            detail={"subscription": subscription.pk},
        )

    return subscription


@transaction.atomic
def forget(user: User, endpoint: str) -> None:
    """Remove *user*'s subscription at *endpoint*, if they have one."""
    found = PushSubscription.objects.filter(
        user=user, endpoint=endpoint
    ).first()
    if found is None:
        return

    pk = found.pk
    found.delete()

    record(
        AuditAction.PUSH_UNSUBSCRIBED,
        actor=user,
        detail={"subscription": pk},
    )


def looking(user: User, conversation: Conversation, *, now: bool) -> None:
    """Mark *user* as looking at *conversation* for a minute, or not at all.

    Not audited: it changes nothing anybody reads, and lapses by itself.
    """
    if not now:
        Looking.objects.filter(user=user, conversation=conversation).delete()
        return

    Looking.objects.update_or_create(
        user=user,
        conversation=conversation,
        defaults={
            "until": timezone.now() + timedelta(seconds=LOOKING_SECONDS)
        },
    )


def level_of(user: User) -> NotifyLevel:
    """What *user* has chosen to be notified about: quiet, unless changed."""
    found = NotificationSetting.objects.filter(user=user).first()

    return NotifyLevel(found.level) if found else NotifyLevel.QUIET


@transaction.atomic
def choose_level(user: User, level: NotifyLevel) -> None:
    """Record what *user* wants to be notified about, with its audit entry."""
    if level_of(user) == level:
        return

    NotificationSetting.objects.update_or_create(
        user=user, defaults={"level": level}
    )

    record(
        AuditAction.NOTIFICATION_SETTING_CHANGED,
        actor=user,
        detail={"level": str(level)},
    )


def readers_not_looking(conversation: Conversation) -> QuerySet[User]:
    """Everybody who may read *conversation*, but has not got it on screen.

    Somebody with the conversation on screen now sees what arrives live.
    """
    watching = Looking.objects.filter(
        conversation=conversation, until__gt=timezone.now()
    ).values("user_id")
    people = members_of(conversation.space).exclude(pk__in=watching)

    if conversation.kind == ConversationKind.DIRECT:
        people = people.filter(
            conversation_participations__conversation=conversation
        )

    return people


def card_recipients(card: Card) -> QuerySet[User]:
    """Everybody to push a card's event to, once its kind says it needs
    somebody: every reader not looking, unless they chose nothing. A card
    that needs somebody counts as being for them, as a mention does.
    """
    return readers_not_looking(card.conversation).exclude(
        notification_setting__level=NotifyLevel.NOTHING
    )


def recipients(message: Message) -> QuerySet[User]:
    """Everybody to push *message* to.

    Only people who may read it, never its writer, and nobody with the
    conversation on screen now, who sees the message arrive live. Then each
    person's own choice: somebody quiet, the default, is pushed a direct
    message or a message that mentions them; somebody who chose everything
    is pushed every message; somebody who chose nothing, none.
    """
    conversation = message.conversation
    people = readers_not_looking(conversation).exclude(pk=message.author_id)

    chose_everything = Q(notification_setting__level=NotifyLevel.EVERYTHING)
    quiet = Q(notification_setting__isnull=True) | Q(
        notification_setting__level=NotifyLevel.QUIET
    )
    for_them = Q(pk__in=mentioned(message.body).values("pk"))
    if conversation.kind == ConversationKind.DIRECT:
        for_them = Q()

    return people.filter(chose_everything | (quiet & for_them)).distinct()


def push_for(message: Message) -> Push:
    """The notification about *message*. Never its text."""
    conversation = message.conversation
    author = message.author.display_name

    if conversation.kind == ConversationKind.CHANNEL:
        title = f"{conversation.name} in {conversation.space.name}"
        body = f"{author} sent a message"
    else:
        title = author
        body = "Sent you a message"

    return Push(
        title=title,
        body=body,
        url=f"/conversations/{conversation.pk}",
        tag=f"conversation-{conversation.pk}",
    )


def send_one(
    subscription: PushSubscription, push: Push, keys: PushKeys
) -> bool:
    """Send *push* to one browser. False if its subscription has gone."""
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=push.payload(),
            vapid_private_key=keys.private,
            vapid_claims={"sub": keys.contact},
            ttl=TIME_TO_LIVE_SECONDS,
            timeout=TIMEOUT_SECONDS,
            headers={"Urgency": "normal", "Topic": push.tag},
        )
    except WebPushException as error:
        status = getattr(error.response, "status_code", None)
        if status in GONE:
            return False

        # Only the status: the address names one browser.
        logger.warning("A push was not accepted: status %s", status)

    return True


#: What sends one push. Tests replace it with a stand-in.
sender: Callable[[PushSubscription, Push, PushKeys], bool] = send_one


def push_for_card(event: CardEvent) -> Push:
    """The notification about a card's event: its title and what happened."""
    card = event.card

    return Push(
        title=card.title,
        body=event.summary,
        url=f"/conversations/{card.conversation_id}",
        tag=f"card-{card.pk}",
    )


def send_to(people: QuerySet[User], push: Push, keys: PushKeys) -> None:
    """Send *push* to every browser of *people*, deleting any gone ones."""
    subscriptions = PushSubscription.objects.filter(user__in=people)

    gone = [s.pk for s in subscriptions if not sender(s, push, keys)]

    if gone:
        PushSubscription.objects.filter(pk__in=gone).delete()


def deliver_card(event_id: int) -> None:
    """Send the push about one card event to everybody it is for."""
    keys = settings.PUSH_KEYS
    event = (
        CardEvent.objects.select_related("card__conversation__space")
        .filter(pk=event_id, notified=True)
        .first()
    )
    if keys is None or event is None:
        return

    send_to(card_recipients(event.card), push_for_card(event), keys)


def deliver(message_id: int) -> None:
    """Send the push about one message to every browser that should have it.

    A subscription the push service says has gone is deleted, so it is not
    tried again.
    """
    keys = settings.PUSH_KEYS
    message = (
        Message.objects.select_related("conversation__space", "author")
        .filter(pk=message_id)
        .first()
    )
    if keys is None or message is None:
        return

    send_to(recipients(message), push_for(message), keys)


def _in_background(job: Callable[[int], None], item_id: int) -> None:
    try:
        job(item_id)
    finally:
        # The thread opened its own database connection; this closes it.
        connection.close()


def start_in_background(message_id: int) -> None:
    """Deliver from a thread of its own, so posting does not wait."""
    threading.Thread(
        target=_in_background,
        args=(deliver, message_id),
        name=f"push-{message_id}",
        daemon=True,
    ).start()


def start_card_in_background(event_id: int) -> None:
    """Deliver a card event's push from a thread of its own."""
    threading.Thread(
        target=_in_background,
        args=(deliver_card, event_id),
        name=f"push-card-{event_id}",
        daemon=True,
    ).start()


#: How a delivery is started. Tests run it in their own thread instead.
start: Callable[[int], None] = start_in_background
start_card: Callable[[int], None] = start_card_in_background


def notify_about(message: Message) -> None:
    """Push *message* to its readers once it is committed, if push is on."""
    if settings.PUSH_KEYS is None:
        return

    message_id = message.pk
    transaction.on_commit(lambda: start(message_id))


def notify_about_card(event: CardEvent) -> None:
    """Push a card event that needs somebody, once it is committed."""
    if settings.PUSH_KEYS is None:
        return

    event_id = event.pk
    transaction.on_commit(lambda: start_card(event_id))
