"""The cards in a conversation, for somebody who may read it."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.cards.bodies import card_body
from app.cards.services import cards_in
from app.conversations.views import caller, readable_conversation


class ConversationCardsView(APIView):
    """``GET`` a conversation's cards. One the caller cannot read is a 404."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        cards = cards_in(user, conversation)

        return Response({"cards": [card_body(c) for c in cards]})
