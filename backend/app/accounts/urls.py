"""The sign-in routes, under ``api/auth/``."""

from django.db import transaction
from django.urls import URLPattern, path

from app.accounts.views import MeView, SignInView, SignOutView

urlpatterns: list[URLPattern] = [
    path("me", MeView.as_view(), name="me"),
    # Outside the per-request transaction, so the rate limit's count of a
    # failed attempt is kept rather than rolled back with it.
    path(
        "sign-in",
        transaction.non_atomic_requests(SignInView.as_view()),
        name="sign-in",
    ),
    path("sign-out", SignOutView.as_view(), name="sign-out"),
]
