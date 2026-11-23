"""The spaces' routes, ``api/spaces`` and beneath it."""

from django.urls import URLPattern, path

from app.spaces.views import (
    RemoveSpaceMemberView,
    SpaceMembersView,
    SpacesView,
    SpaceView,
)

urlpatterns: list[URLPattern] = [
    path("spaces", SpacesView.as_view(), name="spaces"),
    path("spaces/<int:space_id>", SpaceView.as_view(), name="space"),
    path(
        "spaces/<int:space_id>/members",
        SpaceMembersView.as_view(),
        name="space-members",
    ),
    path(
        "spaces/<int:space_id>/members/<int:user_id>/remove",
        RemoveSpaceMemberView.as_view(),
        name="space-member-remove",
    ),
]
