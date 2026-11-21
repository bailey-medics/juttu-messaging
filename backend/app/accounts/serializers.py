"""What the sign-in endpoints read and write."""

from typing import Any

from rest_framework import serializers

from app.accounts.models import User


class SignInSerializer(serializers.Serializer[dict[str, Any]]):
    """A username and a password, as typed.

    The username's surrounding spaces are trimmed, as Quill Medical does;
    the password is taken exactly as given.
    """

    username = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(max_length=4096, trim_whitespace=False)


class UserSerializer(serializers.ModelSerializer[User]):
    """The signed-in person, as the app shows them."""

    class Meta:
        model = User
        fields = ["id", "username"]
        read_only_fields = fields
