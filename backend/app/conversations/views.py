"""Conversations in a space, and their messages.

Every view needs somebody signed in, and every read and post checks on the
server that they may: a space or conversation they cannot read answers 404,
as one that does not exist would.
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
from app.conversations.models import Conversation, ConversationKind, Message
from app.conversations.services import (
    MAX_MESSAGE_LENGTH,
    ConversationRefused,
    can_read,
    conversations_for,
    messages_in,
    post,
    replies_to,
    start_channel,
    start_direct,
)
from app.organisations.competencies import Competency
from app.organisations.services import holds
from app.spaces.models import Space
from app.spaces.services import is_in


class NewConversationSerializer(serializers.Serializer[dict[str, Any]]):
    """A channel with a name, or a direct conversation with people."""

    kind = serializers.ChoiceField(choices=ConversationKind.choices)
    name = serializers.CharField(max_length=100, required=False, default="")
    user_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )


class NewMessageSerializer(serializers.Serializer[dict[str, Any]]):
    """A message's text, and the message it corrects, if any."""

    body = serializers.CharField(
        max_length=MAX_MESSAGE_LENGTH, trim_whitespace=False
    )
    amends = serializers.IntegerField(required=False, allow_null=True)
    thread = serializers.IntegerField(required=False, allow_null=True)


def caller(request: Request) -> User:
    """The signed-in person. ``IsAuthenticated`` has already checked."""
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated()

    return user


def readable_space(user: User, space_id: int) -> Space:
    space = Space.objects.filter(pk=space_id).first()
    if space is None or not is_in(user, space):
        raise Http404

    return space


def readable_conversation(user: User, conversation_id: int) -> Conversation:
    conversation = (
        Conversation.objects.select_related("space")
        .filter(pk=conversation_id)
        .first()
    )
    if conversation is None or not can_read(user, conversation):
        raise Http404

    return conversation


def conversation_body(
    conversation: Conversation, user: User
) -> dict[str, object]:
    if conversation.kind == ConversationKind.CHANNEL:
        title = conversation.name
    else:
        others = [
            p.user.display_name
            for p in conversation.participants.select_related("user")
            if p.user_id != user.pk
        ]
        title = ", ".join(sorted(others))

    return {"id": conversation.pk, "kind": conversation.kind, "title": title}


def message_body(message: Message) -> dict[str, object]:
    return {
        "id": message.pk,
        "author": {
            "id": message.author_id,
            "name": message.author.display_name,
        },
        "body": message.body,
        "created_at": message.created_at.isoformat(),
        "amends": message.amends_id,
        "thread": message.thread_id,
        # Counted by ``messages_in``; a reply, or a message just posted,
        # has none yet.
        "reply_count": getattr(message, "reply_count", 0),
    }


def optional_int(serializer: NewMessageSerializer, name: str) -> int | None:
    """One optional whole number the serializer read, or None."""
    value = serializer.validated_data.get(name)

    return value if isinstance(value, int) else None


def refused(error: ConversationRefused) -> Response:
    return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)


class SpaceConversationsView(APIView):
    """``GET`` the conversations a member may read; ``POST`` starts one."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, space_id: int) -> Response:
        user = caller(request)
        space = readable_space(user, space_id)
        found = conversations_for(user, space)

        return Response(
            {"conversations": [conversation_body(c, user) for c in found]}
        )

    def post(self, request: Request, space_id: int) -> Response:
        user = caller(request)
        space = readable_space(user, space_id)
        serializer = NewConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            if data["kind"] == ConversationKind.CHANNEL:
                if not holds(
                    user, Competency.MANAGE_SPACES, space.organisation
                ):
                    raise PermissionDenied(
                        "Only somebody who manages spaces can open a channel."
                    )
                name = data["name"].strip()
                if not name:
                    raise ConversationRefused("A channel needs a name.")
                conversation = start_channel(space, name, by=user)
            else:
                people = list(User.objects.filter(pk__in=data["user_ids"]))
                if len(people) != len(set(data["user_ids"])):
                    raise ConversationRefused(
                        "Everybody must be in the space."
                    )
                conversation = start_direct(space, people, by=user)
        except ConversationRefused as error:
            return refused(error)

        return Response(
            conversation_body(conversation, user),
            status=status.HTTP_201_CREATED,
        )


class MessagesView(APIView):
    """``GET`` a conversation's latest messages; ``POST`` adds one."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, conversation_id: int) -> Response:
        conversation = readable_conversation(caller(request), conversation_id)
        messages = messages_in(conversation)

        return Response({"messages": [message_body(m) for m in messages]})

    def post(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        serializer = NewMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amends_id = serializer.validated_data.get("amends")
        amends = (
            Message.objects.filter(pk=amends_id).first()
            if amends_id is not None
            else None
        )
        thread_id = optional_int(serializer, "thread")
        thread = (
            Message.objects.filter(pk=thread_id).first()
            if thread_id is not None
            else None
        )
        if thread_id is not None and thread is None:
            return Response(
                {"detail": "That thread is in another conversation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amends_id is not None and amends is None:
            return Response(
                {"detail": "You can only correct your own messages here."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            message = post(
                conversation,
                serializer.validated_data["body"],
                by=user,
                amends=amends,
                thread=thread,
            )
        except ConversationRefused as error:
            return refused(error)

        return Response(message_body(message), status=status.HTTP_201_CREATED)


class RepliesView(APIView):
    """``GET`` the replies in one message's thread."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, message_id: int) -> Response:
        user = caller(request)
        message = (
            Message.objects.select_related("conversation__space")
            .filter(pk=message_id)
            .first()
        )
        if message is None or not can_read(user, message.conversation):
            raise Http404

        replies = replies_to(message)

        return Response({"replies": [message_body(m) for m in replies]})
