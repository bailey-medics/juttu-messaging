"""The cards in a conversation, for somebody who may read it."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.cards.models import Card, CardEvent
from app.cards.services import cards_in
from app.conversations.views import caller, readable_conversation

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


class ConversationCardsView(APIView):
    """``GET`` a conversation's cards. One the caller cannot read is a 404."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        cards = cards_in(user, conversation)

        return Response({"cards": [card_body(c) for c in cards]})
