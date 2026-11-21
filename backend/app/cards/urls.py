"""The cards' routes."""

from django.urls import URLPattern, path

from app.cards.views import ConversationCardsView

urlpatterns: list[URLPattern] = [
    path(
        "conversations/<int:conversation_id>/cards",
        ConversationCardsView.as_view(),
        name="conversation-cards",
    ),
]
