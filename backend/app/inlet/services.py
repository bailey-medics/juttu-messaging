"""Registering senders, and taking in the events they send.

A sender's secret reads ``<sender id>.<random part>``. The id says which
sender's hash to check, so Juttu checks one slow password hash, never one
for every sender. Juttu shows the secret once, when the sender is
registered, and keeps only the hash of its random part.
"""

import secrets
from collections.abc import Mapping
from dataclasses import dataclass

from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.cards.models import CardEvent
from app.cards.services import receive
from app.conversations.models import Conversation, ConversationKind
from app.inlet.kinds import OutsideKind
from app.inlet.models import Sender

#: Bytes of randomness in a secret: as strong as a session key, or more.
SECRET_BYTES = 32


class SenderRefused(Exception):
    """A sender that cannot be registered or changed, with the reason."""


@dataclass(frozen=True)
class Registered:
    """A sender just registered, and its secret, shown this once."""

    sender: Sender
    secret: str


def channels() -> QuerySet[Conversation]:
    """Every channel in the organisation, a sender's cards may land in."""
    return (
        Conversation.objects.filter(kind=ConversationKind.CHANNEL)
        .select_related("space")
        .order_by("space__name", "name", "pk")
    )


def senders() -> QuerySet[Sender]:
    """Every sender, open ones first, then by name."""
    return Sender.objects.select_related("conversation__space").order_by(
        "closed_at", "name", "pk"
    )


def channel_for(conversation_id: int) -> Conversation:
    """The channel with this id, or a refusal saying why not."""
    found = channels().filter(pk=conversation_id).first()
    if found is None:
        raise SenderRefused("A sender's cards must land in a channel.")

    return found


@transaction.atomic
def register(name: str, conversation: Conversation, *, by: User) -> Registered:
    """Register a sender whose cards land in *conversation*."""
    name = name.strip()
    if not name:
        raise SenderRefused("A sender needs a name.")

    if conversation.kind != ConversationKind.CHANNEL:
        raise SenderRefused("A sender's cards must land in a channel.")

    random_part = secrets.token_urlsafe(SECRET_BYTES)
    sender = Sender.objects.create(
        name=name,
        conversation=conversation,
        secret_hash=make_password(random_part),
        created_by=by,
    )

    record(
        AuditAction.SENDER_REGISTERED,
        actor=by,
        detail={"sender": sender.pk, "conversation": conversation.pk},
    )

    return Registered(sender=sender, secret=f"{sender.pk}.{random_part}")


@transaction.atomic
def move(sender: Sender, conversation: Conversation, *, by: User) -> None:
    """Send *sender*'s new cards to another channel from now on."""
    if sender.closed_at is not None:
        raise SenderRefused("A closed sender cannot be changed.")

    if conversation.kind != ConversationKind.CHANNEL:
        raise SenderRefused("A sender's cards must land in a channel.")

    before = sender.conversation_id
    sender.conversation = conversation
    sender.save(update_fields=["conversation"])

    record(
        AuditAction.SENDER_CHANNEL_CHANGED,
        actor=by,
        detail={
            "sender": sender.pk,
            "from": before,
            "to": conversation.pk,
        },
    )


@transaction.atomic
def close(sender: Sender, *, by: User) -> None:
    """Close *sender*. Its secret stops working at once, for good."""
    if sender.closed_at is not None:
        return

    sender.closed_at = timezone.now()
    sender.save(update_fields=["closed_at"])

    record(AuditAction.SENDER_CLOSED, actor=by, detail={"sender": sender.pk})


def sender_for(secret: str) -> Sender | None:
    """The open sender this secret belongs to, or None.

    None for a secret of the wrong shape, an unknown or closed sender, or a
    random part that does not match.
    """
    sender_id, dot, random_part = secret.partition(".")
    if not dot or not sender_id.isdigit() or not random_part:
        return None

    sender = (
        Sender.objects.select_related("conversation")
        .filter(pk=int(sender_id), closed_at__isnull=True)
        .first()
    )
    if sender is None or not check_password(random_part, sender.secret_hash):
        return None

    return sender


def take_in(sender: Sender, event: Mapping[str, object]) -> CardEvent:
    """Apply *event* from *sender* to its card in the sender's channel.

    The sender's id goes into the event here, never from what was sent, so
    one sender cannot touch another's cards.

    Raises:
        EventRefused: If the event is not one the ``outside`` kind accepts.
    """
    stamped = {**event, "sender": sender.pk}

    return receive(sender.conversation, OutsideKind.name, stamped)
