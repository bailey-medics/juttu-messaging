"""What a browser sends to subscribe, checked on the way in."""

from typing import Any

from rest_framework import serializers

from app.push.endpoints import is_push_endpoint
from app.push.models import MAX_ENDPOINT_LENGTH, NotifyLevel

#: A key written in URL-safe base64, perhaps padded.
BASE64 = r"^[A-Za-z0-9_-]+=*$"


class KeysSerializer(serializers.Serializer[dict[str, Any]]):
    """The browser's encryption keys.

    A P-256 public key, 65 bytes, is 87 characters of URL-safe base64; the
    secret, 16 bytes, is 22. The limits leave room for padding and nothing
    more, as Quill Medical's do.
    """

    p256dh = serializers.RegexField(BASE64, max_length=100)
    auth = serializers.RegexField(BASE64, max_length=40)


def push_endpoint(value: str) -> None:
    """Refuse an address that is not a push service's."""
    if not is_push_endpoint(value):
        raise serializers.ValidationError(
            "This is not the address of a push service."
        )


class SubscriptionSerializer(serializers.Serializer[dict[str, Any]]):
    """A subscription, as the browser's Push API gives it."""

    endpoint = serializers.CharField(
        max_length=MAX_ENDPOINT_LENGTH, validators=[push_endpoint]
    )
    expirationTime = serializers.IntegerField(  # noqa: N815 - the browser's name
        required=False, allow_null=True
    )
    keys = KeysSerializer()


class LookingSerializer(serializers.Serializer[dict[str, Any]]):
    """Which conversation the person has on screen, or has put away."""

    conversation = serializers.IntegerField(min_value=1)
    looking = serializers.BooleanField()


class LevelSerializer(serializers.Serializer[dict[str, Any]]):
    """What the person wants to be notified about."""

    level = serializers.ChoiceField(choices=NotifyLevel.choices)


class EndpointSerializer(serializers.Serializer[dict[str, Any]]):
    """The subscription to forget, named by its endpoint."""

    endpoint = serializers.CharField(max_length=MAX_ENDPOINT_LENGTH)
