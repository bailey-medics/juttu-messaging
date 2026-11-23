"""The inlet's routes: events from senders, and managing senders.

``POST /api/inlet/events`` has no session: a sender proves who it is with
its secret in an ``Authorization: Bearer`` header, on every event. The
routes that manage senders are for an organisation admin only.
"""

from typing import Any

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.models import User
from app.cards.kinds import EventRefused
from app.conversations.models import Conversation
from app.inlet.models import Sender
from app.inlet.services import (
    SenderRefused,
    channel_for,
    channels,
    close,
    move,
    register,
    sender_for,
    senders,
    take_in,
)
from app.organisations.services import is_organisation_admin, the_organisation

BEARER = "Bearer "


class ManagesSenders(BasePermission):
    """Signed in, and an organisation admin. Read on every request."""

    message = "Only an organisation admin can manage senders."

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user

        if not isinstance(user, User) or not user.is_authenticated:
            return False

        return is_organisation_admin(user, the_organisation())


def acting_user(request: Request) -> User:
    """The signed-in admin. ``ManagesSenders`` has already checked."""
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated()

    return user


def channel_body(conversation: Conversation) -> dict[str, object]:
    return {
        "id": conversation.pk,
        "name": conversation.name,
        "space": {
            "id": conversation.space_id,
            "name": conversation.space.name,
        },
    }


def sender_body(sender: Sender) -> dict[str, object]:
    closed_at = sender.closed_at

    return {
        "id": sender.pk,
        "name": sender.name,
        "channel": channel_body(sender.conversation),
        "created_at": sender.created_at.isoformat(),
        "closed_at": closed_at.isoformat() if closed_at else None,
    }


def refused(reason: str) -> Response:
    return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)


class EventsView(APIView):
    """``POST`` one event from a sender, which updates its card."""

    # No session and no cookie: the secret alone says who is sending, so
    # there is nothing for another site to forge.
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        header = request.headers.get("Authorization", "")
        sender = None
        if header.startswith(BEARER):
            sender = sender_for(header.removeprefix(BEARER).strip())

        if sender is None:
            return Response(
                {"detail": "That sender's secret is not recognised."},
                status=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not isinstance(request.data, dict):
            return refused("An event is one JSON object.")

        try:
            happened = take_in(sender, request.data)
        except EventRefused as error:
            return refused(str(error))

        return Response(
            {"card": happened.card_id, "event": happened.pk},
            status=status.HTTP_202_ACCEPTED,
        )


class NewSenderSerializer(serializers.Serializer[dict[str, Any]]):
    name = serializers.CharField(max_length=100)
    channel = serializers.IntegerField()


class ChannelSerializer(serializers.Serializer[dict[str, Any]]):
    channel = serializers.IntegerField()


class SendersView(APIView):
    """``GET`` every sender; ``POST`` registers one, showing its secret."""

    permission_classes = [ManagesSenders]

    def get(self, request: Request) -> Response:
        return Response({"senders": [sender_body(s) for s in senders()]})

    def post(self, request: Request) -> Response:
        serializer = NewSenderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            channel = channel_for(data["channel"])
            made = register(data["name"], channel, by=acting_user(request))
        except SenderRefused as error:
            return refused(str(error))

        return Response(
            {**sender_body(made.sender), "secret": made.secret},
            status=status.HTTP_201_CREATED,
        )


class SenderChannelView(APIView):
    """``POST`` a sender's new channel, for its cards from now on."""

    permission_classes = [ManagesSenders]

    def post(self, request: Request, sender_id: int) -> Response:
        sender = get_object_or_404(Sender, pk=sender_id)
        serializer = ChannelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            channel = channel_for(serializer.validated_data["channel"])
            move(sender, channel, by=acting_user(request))
        except SenderRefused as error:
            return refused(str(error))

        sender.refresh_from_db()

        return Response(sender_body(sender))


class CloseSenderView(APIView):
    """``POST`` closes a sender. Its secret stops working at once."""

    permission_classes = [ManagesSenders]

    def post(self, request: Request, sender_id: int) -> Response:
        sender = get_object_or_404(Sender, pk=sender_id)
        close(sender, by=acting_user(request))

        return Response(sender_body(sender))


class ChannelsView(APIView):
    """``GET`` every channel a sender's cards may land in."""

    permission_classes = [ManagesSenders]

    def get(self, request: Request) -> Response:
        return Response({"channels": [channel_body(c) for c in channels()]})
