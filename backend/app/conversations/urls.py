"""The conversations' routes."""

from django.db import transaction
from django.urls import URLPattern, path

from app.conversations.views import (
    ConversationsView,
    ConversationView,
    EventsView,
    MarkReadView,
    MessagesView,
    RepliesView,
    ShowsPeopleView,
    SpaceConversationsView,
)

urlpatterns: list[URLPattern] = [
    # Outside the per-request transaction: the stream outlives the view,
    # and each read in it should see what has just been committed.
    path(
        "events",
        transaction.non_atomic_requests(EventsView.as_view()),
        name="events",
    ),
    path(
        "conversations",
        ConversationsView.as_view(),
        name="conversations",
    ),
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
        "conversations/<int:conversation_id>",
        ConversationView.as_view(),
        name="conversation",
    ),
    path(
        "conversations/<int:conversation_id>/shows-people",
        ShowsPeopleView.as_view(),
        name="conversation-shows-people",
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
