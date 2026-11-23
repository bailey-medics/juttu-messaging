"""What the members endpoints read and write."""

from typing import Any

from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers

from app.organisations.members import Member


class AddMemberSerializer(serializers.Serializer[dict[str, Any]]):
    """A new person's name, username and password, as the admin typed them."""

    name = serializers.CharField(max_length=200, trim_whitespace=True)
    username = serializers.CharField(
        max_length=150,
        trim_whitespace=True,
        validators=[UnicodeUsernameValidator()],
    )
    password = serializers.CharField(max_length=128, trim_whitespace=False)


def member_body(member: Member) -> dict[str, object]:
    """One member, as the admin screen shows them."""
    return {
        "id": member.user.pk,
        "username": member.user.username,
        "name": member.user.display_name,
        "is_admin": member.is_admin,
    }
