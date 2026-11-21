"""Subscribing a browser to push notifications, and forgetting one.

Each view needs somebody signed in, and acts only on their own
subscriptions.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.conversations.views import caller, readable_conversation
from app.push.models import NotifyLevel, PushSubscription
from app.push.serializers import (
    EndpointSerializer,
    LevelSerializer,
    LookingSerializer,
    SubscriptionSerializer,
)
from app.push.services import (
    choose_level,
    forget,
    level_of,
    looking,
    subscribe,
)


class PushKeyView(APIView):
    """``GET`` the public key a browser subscribes with, or null if off."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        keys = settings.PUSH_KEYS

        return Response({"public_key": keys.public if keys else None})


class SubscriptionsView(APIView):
    """``POST`` stores this browser's subscription for the caller."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user = caller(request)
        serializer = SubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subscribe(
            user,
            data["endpoint"],
            data["keys"]["p256dh"],
            data["keys"]["auth"],
        )
        count = PushSubscription.objects.filter(user=user).count()

        return Response({"count": count}, status=status.HTTP_201_CREATED)


class RemoveSubscriptionView(APIView):
    """``POST`` forgets one of the caller's subscriptions."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user = caller(request)
        serializer = EndpointSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        forget(user, serializer.validated_data["endpoint"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class LookingView(APIView):
    """``POST`` says the caller has a conversation on screen, or not.

    A conversation they cannot read answers 404, as one that does not exist
    would.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user = caller(request)
        serializer = LookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        conversation = readable_conversation(user, data["conversation"])

        looking(user, conversation, now=data["looking"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class SettingsView(APIView):
    """``GET`` what the caller is notified about; ``POST`` changes it."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response({"level": str(level_of(caller(request)))})

    def post(self, request: Request) -> Response:
        user = caller(request)
        serializer = LevelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        level = NotifyLevel(serializer.validated_data["level"])

        choose_level(user, level)

        return Response({"level": str(level)})
