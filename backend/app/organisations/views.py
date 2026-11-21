"""The organisation's members: list, add, remove and make admin.

Every view here is for an organisation admin only, through
``ManagesMembers``. Each change writes its audit entry in the service it
calls, inside the request's transaction.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.models import User
from app.organisations.members import (
    MemberRefused,
    add_person,
    make_admin,
    members_of,
    remove_person,
)
from app.organisations.permissions import ManagesMembers
from app.organisations.serializers import AddMemberSerializer, member_body
from app.organisations.services import the_organisation


def acting_user(request: Request) -> User:
    """The signed-in admin. ``ManagesMembers`` has already checked this."""
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated()

    return user


def refused(error: MemberRefused) -> Response:
    return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


class MembersView(APIView):
    """``GET`` lists the members; ``POST`` adds a person."""

    permission_classes = [ManagesMembers]

    def get(self, request: Request) -> Response:
        members = members_of(the_organisation())

        return Response({"members": [member_body(m) for m in members]})

    def post(self, request: Request) -> Response:
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = add_person(
                the_organisation(),
                name=data["name"],
                username=data["username"],
                password=data["password"],
                by=acting_user(request),
            )
        except MemberRefused as error:
            return refused(error)

        body = {
            "id": user.pk,
            "username": user.username,
            "name": user.display_name,
            "is_admin": False,
        }

        return Response(body, status=status.HTTP_201_CREATED)


class RemoveMemberView(APIView):
    """``POST`` closes a member's account and ends their membership."""

    permission_classes = [ManagesMembers]

    def post(self, request: Request, user_id: int) -> Response:
        user = get_object_or_404(User, pk=user_id)

        try:
            remove_person(the_organisation(), user, by=acting_user(request))
        except MemberRefused as error:
            return refused(error)

        return Response(status=status.HTTP_204_NO_CONTENT)


class MakeAdminView(APIView):
    """``POST`` makes a member an organisation admin."""

    permission_classes = [ManagesMembers]

    def post(self, request: Request, user_id: int) -> Response:
        user = get_object_or_404(User, pk=user_id)

        try:
            make_admin(the_organisation(), user, by=acting_user(request))
        except MemberRefused as error:
            return refused(error)

        return Response(status=status.HTTP_204_NO_CONTENT)
