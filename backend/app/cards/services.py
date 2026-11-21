"""Receiving an event, and the cards a person may see.

An event never becomes a message: it finds the card its kind says it is
about, or creates it, and updates it. Every event is kept, and audited.
"""

from collections.abc import Mapping

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.cards.kinds import EventRefused, kind_named
from app.cards.models import Card, CardEvent
from app.conversations.live import announce, hold_post_lock
from app.conversations.models import Conversation
from app.conversations.services import can_read
from app.push.services import notify_about_card


@transaction.atomic
def receive(
    conversation: Conversation, kind_name: str, event: Mapping[str, object]
) -> CardEvent:
    """Apply one event to its card in *conversation*, creating the card.

    Raises:
        EventRefused: If no kind has this name, or the kind refuses it.
    """
    kind = kind_named(kind_name)
    if kind is None:
        raise EventRefused(f"There is no kind of card named {kind_name!r}.")

    key, accepted = kind.accept(event)
    card = (
        Card.objects.select_for_update()
        .filter(conversation=conversation, kind=kind_name, key=key)
        .first()
    )
    update = kind.apply(card.state if card else None, accepted)
    now = timezone.now()

    # Card event ids then commit in order, as message ids do, which live
    # delivery's "everything after the last id" relies on.
    hold_post_lock()

    if card is None:
        card = Card(
            conversation=conversation, kind=kind_name, key=key, created_at=now
        )
    card.title = update.title
    card.state = dict(update.state)
    card.needs_attention = update.notify
    card.updated_at = now
    card.save()

    happened = CardEvent.objects.create(
        card=card,
        data=dict(accepted),
        summary=update.summary,
        notified=update.notify,
        received_at=now,
    )

    # The entry names the card and the event, never what the event said.
    record(
        AuditAction.CARD_EVENT_RECEIVED,
        detail={"card": card.pk, "event": happened.pk, "kind": kind_name},
    )
    announce(conversation.pk)
    if update.notify:
        notify_about_card(happened)

    return happened


def cards_in(user: User, conversation: Conversation) -> QuerySet[Card]:
    """The cards in *conversation*, oldest first, if *user* may read it."""
    if not can_read(user, conversation):
        return Card.objects.none()

    return conversation.cards.order_by("created_at", "pk")
