"""Spaces and their members.

Every view needs somebody signed in. Seeing a space, and its members,
needs being in it; a space somebody is not in answers 404, as one that does
not exist would. Making a space, and changing who is in one, needs
``manage_spaces`` at the organisation as well.
"""

from typing import Any

from django.http import Http404
from rest_framework import serializers, status
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.models import User
from app.organisations.competencies import Competency
from app.organisations.services import holds, the_organisation
from app.spaces.models import Space
from app.spaces.services import (
    SpaceRefused,
    add_to_space,
    create_space,
    is_in,
    members_of,
    remove_from_space,
    spaces_of,
)


class NewSpaceSerializer(serializers.Serializer[dict[str, Any]]):
    """A new space's name, and whether it is clinical (no, unless said)."""

    name = serializers.CharField(max_length=100, trim_whitespace=True)
    is_clinical = serializers.BooleanField(default=False)


class AddToSpaceSerializer(serializers.Serializer[dict[str, Any]]):
    """The person to put in a space."""

    user_id = serializers.IntegerField()


def caller(request: Request) -> User:
    """The signed-in person. ``IsAuthenticated`` has already checked."""
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated()

    return user


def space_body(space: Space) -> dict[str, object]:
    return {
        "id": space.pk,
        "name": space.name,
        "is_clinical": space.is_clinical,
    }


def visible_space(user: User, space_id: int) -> Space:
    """The space, if *user* is in it; 404 otherwise, whether or not it exists."""
    space = Space.objects.filter(pk=space_id).first()
    if space is None or not is_in(user, space):
        raise Http404

    return space


def require_manage_spaces(user: User) -> None:
    if not holds(user, Competency.MANAGE_SPACES, the_organisation()):
        raise PermissionDenied("Only somebody who manages spaces can do that.")


def refused(error: SpaceRefused) -> Response:
    return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


class SpacesView(APIView):
    """``GET`` the caller's spaces; ``POST`` makes one."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        spaces = spaces_of(caller(request))

        return Response({"spaces": [space_body(s) for s in spaces]})

    def post(self, request: Request) -> Response:
        user = caller(request)
        require_manage_spaces(user)
        serializer = NewSpaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        space = create_space(
            the_organisation(),
            serializer.validated_data["name"],
            is_clinical=serializer.validated_data["is_clinical"],
            by=user,
        )

        return Response(space_body(space), status=status.HTTP_201_CREATED)


class SpaceView(APIView):
    """``GET`` one space the caller is in."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, space_id: int) -> Response:
        space = visible_space(caller(request), space_id)

        return Response(space_body(space))


class SpaceMembersView(APIView):
    """``GET`` who is in a space; ``POST`` puts somebody in it."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, space_id: int) -> Response:
        space = visible_space(caller(request), space_id)
        members = [
            {"id": u.pk, "username": u.username, "name": u.display_name}
            for u in members_of(space)
        ]

        return Response({"members": members})

    def post(self, request: Request, space_id: int) -> Response:
        user = caller(request)
        space = visible_space(user, space_id)
        require_manage_spaces(user)
        serializer = AddToSpaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        person = User.objects.filter(
            pk=serializer.validated_data["user_id"]
        ).first()
        if person is None:
            return Response(
                {"detail": "No such person."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            add_to_space(space, person, by=user)
        except SpaceRefused as error:
            return refused(error)

        return Response(status=status.HTTP_204_NO_CONTENT)


class RemoveSpaceMemberView(APIView):
    """``POST`` takes somebody out of a space."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, space_id: int, user_id: int) -> Response:
        user = caller(request)
        space = visible_space(user, space_id)
        require_manage_spaces(user)
        person = User.objects.filter(pk=user_id).first()
        if person is None:
            raise Http404

        try:
            remove_from_space(space, person, by=user)
        except SpaceRefused as error:
            return refused(error)

        return Response(status=status.HTTP_204_NO_CONTENT)
