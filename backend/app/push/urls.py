"""The push notifications' routes, under ``api/push``."""

from django.urls import URLPattern, path

from app.push.views import (
    LookingView,
    PushKeyView,
    RemoveSubscriptionView,
    SubscriptionsView,
)

urlpatterns: list[URLPattern] = [
    path("key", PushKeyView.as_view(), name="push-key"),
    path("looking", LookingView.as_view(), name="push-looking"),
    path(
        "subscriptions", SubscriptionsView.as_view(), name="push-subscriptions"
    ),
    path(
        "subscriptions/remove",
        RemoveSubscriptionView.as_view(),
        name="push-subscription-remove",
    ),
]
