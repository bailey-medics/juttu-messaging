"""The conversations' routes."""

from django.urls import URLPattern, path

from app.conversations.views import (
    MarkReadView,
    MessagesView,
    RepliesView,
    SpaceConversationsView,
)

urlpatterns: list[URLPattern] = [
    path(
        "spaces/<int:space_id>/conversations",
        SpaceConversationsView.as_view(),
        name="space-conversations",
    ),
    path(
        "conversations/<int:conversation_id>/messages",
        MessagesView.as_view(),
        name="conversation-messages",
    ),
    path(
        "conversations/<int:conversation_id>/read",
        MarkReadView.as_view(),
        name="conversation-read",
    ),
    path(
        "messages/<int:message_id>/replies",
        RepliesView.as_view(),
        name="message-replies",
    ),
]
