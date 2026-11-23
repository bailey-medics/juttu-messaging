"""How a card is written in an answer, and in the live stream."""

from app.cards.models import Card, CardEvent

#: How many of a card's latest events its thread shows.
EVENTS_SHOWN = 20


def event_body(event: CardEvent) -> dict[str, object]:
    return {
        "id": event.pk,
        "summary": event.summary,
        "received_at": event.received_at.isoformat(),
    }


def card_body(card: Card) -> dict[str, object]:
    """One card, with its latest events oldest first."""
    latest = list(card.events.order_by("-received_at", "-pk")[:EVENTS_SHOWN])

    return {
        "id": card.pk,
        "kind": card.kind,
        "title": card.title,
        "state": card.state,
        "needs_attention": card.needs_attention,
        "created_at": card.created_at.isoformat(),
        "updated_at": card.updated_at.isoformat(),
        "events": [event_body(e) for e in reversed(latest)],
    }
