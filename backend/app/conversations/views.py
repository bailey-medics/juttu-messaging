"""Conversations in a space, and their messages.

Every view needs somebody signed in, and every read and post checks on the
server that they may: a space or conversation they cannot read answers 404,
as one that does not exist would.
"""

import json
from collections.abc import Mapping
from typing import Any

from django.http import Http404, HttpResponse, StreamingHttpResponse
from rest_framework import serializers, status
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.models import User
from app.cards.bodies import card_body
from app.cards.models import CardEvent
from app.conversations import live
from app.conversations.icons import (
    MAX_UPLOAD_BYTES,
    IconRefused,
    icon_image,
    remove_icon_image,
    set_icon_image,
)
from app.conversations.models import Conversation, ConversationKind, Message
from app.conversations.services import (
    MAX_MESSAGE_LENGTH,
    ConversationRefused,
    ShowsPeopleRefused,
    all_conversations_for,
    can_read,
    conversations_for,
    mark_read,
    messages_in,
    post,
    replies_to,
    set_shows_people,
    start_channel,
    start_direct,
    unread_counts,
)
from app.organisations.competencies import Competency
from app.organisations.services import (
    holds,
    is_organisation_admin,
    the_organisation,
)
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
    conversation: Conversation, user: User, unread: int = 0
) -> dict[str, object]:
    if conversation.kind == ConversationKind.CHANNEL:
        title = conversation.name
    else:
        # ``all()`` uses the people a caller prefetched, if it did.
        others = [
            p.user.display_name
            for p in conversation.participants.all()
            if p.user_id != user.pk
        ]
        title = ", ".join(sorted(others))

    return {
        "id": conversation.pk,
        "kind": conversation.kind,
        "title": title,
        "unread_count": unread,
        "icon": conversation.icon,
        "icon_colour": conversation.icon_colour,
        "shows_people": conversation.shows_people,
        "icon_url": icon_url(conversation),
    }


def icon_url(conversation: Conversation) -> str | None:
    """Where its uploaded icon is, with its version, or None for none."""
    if conversation.icon_version is None:
        return None

    return f"/api/conversations/{conversation.pk}/icon?v={conversation.icon_version}"


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


def home_conversation_body(
    conversation: Conversation, user: User, unread: int
) -> dict[str, object]:
    """A conversation as Home lists it: with its space, and when it was last
    active, since the list spans every space."""
    last_active_at = getattr(
        conversation, "last_active_at", conversation.created_at
    )

    return {
        **conversation_body(conversation, user, unread),
        "space": {
            "id": conversation.space_id,
            "name": conversation.space.name,
        },
        "last_active_at": last_active_at.isoformat(),
    }


class ConversationsView(APIView):
    """``GET`` every conversation the caller may read, for Home."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = caller(request)
        found = list(all_conversations_for(user))
        unread = unread_counts(user, [c.pk for c in found])

        bodies = [
            home_conversation_body(c, user, unread.get(c.pk, 0)) for c in found
        ]

        return Response({"conversations": bodies})


class SpaceConversationsView(APIView):
    """``GET`` the conversations a member may read; ``POST`` starts one."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, space_id: int) -> Response:
        user = caller(request)
        space = readable_space(user, space_id)
        found = list(conversations_for(user, space))
        unread = unread_counts(user, [c.pk for c in found])
        bodies = [
            conversation_body(c, user, unread.get(c.pk, 0)) for c in found
        ]

        return Response({"conversations": bodies})

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


class ReadSerializer(serializers.Serializer[dict[str, Any]]):
    """The newest message and the newest card the person has seen: either,
    or both."""

    message_id = serializers.IntegerField(min_value=1, required=False)
    card_id = serializers.IntegerField(min_value=1, required=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if "message_id" not in attrs and "card_id" not in attrs:
            raise serializers.ValidationError(
                "Say the newest message or card seen."
            )

        return attrs


class MarkReadView(APIView):
    """``POST`` moves the caller's read point in a conversation forward."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        serializer = ReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        seen = serializer.validated_data

        mark_read(
            user,
            conversation,
            message_id=seen.get("message_id"),
            card_id=seen.get("card_id"),
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationView(APIView):
    """``GET`` one conversation the caller may read: its title, kind, icon
    and whether it shows its people. One they cannot read answers 404."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        unread = unread_counts(user, [conversation.pk]).get(conversation.pk, 0)

        return Response(conversation_body(conversation, user, unread))


class ShowsPeopleSerializer(serializers.Serializer[dict[str, Any]]):
    """Whether a channel shows its people's circles on Home."""

    shows_people = serializers.BooleanField()


class ShowsPeopleView(APIView):
    """``POST`` shows or hides a channel's people on Home, for everybody.

    Only an organisation admin may, in a conversation they can read; a
    conversation they cannot read answers 404, as everywhere else.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)

        if not is_organisation_admin(user, the_organisation()):
            raise PermissionDenied(
                "Only an organisation admin can change what a channel shows."
            )

        serializer = ShowsPeopleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            set_shows_people(
                conversation,
                serializer.validated_data["shows_people"],
                by=user,
            )
        except ShowsPeopleRefused as refused:
            return Response(
                {"detail": str(refused)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(conversation_body(conversation, user))


def require_organisation_admin(user: User) -> None:
    if not is_organisation_admin(user, the_organisation()):
        raise PermissionDenied(
            "Only an organisation admin can change a conversation's icon."
        )


class IconView(APIView):
    """A conversation's uploaded icon.

    ``GET`` answers the PNG to anybody who may read the conversation.
    ``PUT`` takes one image, as the form field ``image``, and ``DELETE``
    removes it, for an organisation admin. A conversation the caller cannot
    read answers 404, as everywhere else.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get(self, request: Request, conversation_id: int) -> HttpResponse:
        conversation = readable_conversation(caller(request), conversation_id)
        image = icon_image(conversation)

        if image is None:
            raise Http404

        response = HttpResponse(image, content_type="image/png")
        # The address carries the icon's version, so a cached copy is
        # never out of date. Private: only people who may read it get it.
        response["Cache-Control"] = "private, max-age=31536000, immutable"

        return response

    def put(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        require_organisation_admin(user)
        upload = request.FILES.get("image")

        if upload is None:
            return Response(
                {"detail": "Send the image as the form field image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Refused before it is read, so a big file never fills memory.
        if upload.size is None or upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": "The image must be 1 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            set_icon_image(conversation, upload.read(), by=user)
        except IconRefused as refused:
            return Response(
                {"detail": str(refused)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(conversation_body(conversation, user))

    def delete(self, request: Request, conversation_id: int) -> Response:
        user = caller(request)
        conversation = readable_conversation(user, conversation_id)
        require_organisation_admin(user)

        remove_icon_image(conversation, by=user)

        return Response(conversation_body(conversation, user))


class EventStreamRenderer(BaseRenderer):
    """Lets a browser asking for ``text/event-stream`` through.

    The stream itself is written by ``live.stream``; this renders only a
    refusal, such as "not signed in", as JSON.
    """

    media_type = "text/event-stream"
    format = "event-stream"

    def render(
        self,
        data: object,
        accepted_media_type: str | None = None,
        renderer_context: Mapping[str, object] | None = None,
    ) -> bytes:
        return json.dumps(data).encode()


def last_event_id(request: Request) -> live.Cursor | None:
    """How far the app had reached, or None to start from now.

    A browser reconnecting by itself sends ``Last-Event-ID``; the app sends
    ``?after=`` when it opens a new stream after a failure. Anything that is
    not an event id is ignored.
    """
    given = request.headers.get("Last-Event-ID") or request.query_params.get(
        "after", ""
    )

    return live.Cursor.parse(given)


def card_event_body(card_event: CardEvent) -> dict[str, object]:
    """A card, as it stands after *card_event*, for the live stream."""
    return card_body(card_event.card)


class EventsView(APIView):
    """``GET`` a stream of the new messages the caller may read."""

    permission_classes = [IsAuthenticated]
    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def get(self, request: Request) -> StreamingHttpResponse:
        user = caller(request)
        session = request.session
        key = session.session_key

        def still_signed_in() -> bool:
            return key is not None and session.exists(key)

        response = StreamingHttpResponse(
            live.stream(
                user.pk,
                last_event_id(request),
                describe=message_body,
                describe_card=card_event_body,
                still_signed_in=still_signed_in,
            ),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        # Asks any proxy that buffers, such as nginx, to pass each event on.
        response["X-Accel-Buffering"] = "no"

        return response
