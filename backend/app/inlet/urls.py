"""The inlet's routes, under ``api/inlet/``."""

from django.urls import URLPattern, path

from app.inlet.views import (
    ChannelsView,
    CloseSenderView,
    EventsView,
    SenderChannelView,
    SendersView,
)

urlpatterns: list[URLPattern] = [
    path("events", EventsView.as_view(), name="inlet-events"),
    path("senders", SendersView.as_view(), name="inlet-senders"),
    path(
        "senders/<int:sender_id>/channel",
        SenderChannelView.as_view(),
        name="inlet-sender-channel",
    ),
    path(
        "senders/<int:sender_id>/close",
        CloseSenderView.as_view(),
        name="inlet-sender-close",
    ),
    path("channels", ChannelsView.as_view(), name="inlet-channels"),
]
