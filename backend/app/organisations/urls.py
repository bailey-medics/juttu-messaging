"""The organisation's routes, ``api/members`` and beneath it."""

from django.urls import URLPattern, path

from app.organisations.views import (
    MakeAdminView,
    MembersView,
    RemoveMemberView,
)

urlpatterns: list[URLPattern] = [
    path("members", MembersView.as_view(), name="members"),
    path(
        "members/<int:user_id>/remove",
        RemoveMemberView.as_view(),
        name="member-remove",
    ),
    path(
        "members/<int:user_id>/make-admin",
        MakeAdminView.as_view(),
        name="member-make-admin",
    ),
]
