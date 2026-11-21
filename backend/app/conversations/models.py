"""A conversation, who is in a direct one, and its messages."""

from django.conf import settings
from django.db import models
from django.utils import timezone

from app.spaces.models import Space

#: How a message's stored body is protected. Messages are encrypted in
#: transit and on disk, by the box's operating system, and readable by the
#: server; Juttu's code handles no keys. A space that later moves to
#: end-to-end encryption writes a different value, with no new table.
PROTECTION_NONE = "none_at_application_level"

#: The shape of a stored message. Raised when the shape changes, so old and
#: new messages can be read side by side.
MESSAGE_FORMAT_VERSION = 1


class ConversationKind(models.TextChoices):
    """A channel is open to everybody in its space; a direct one is not."""

    CHANNEL = "channel", "Channel"
    DIRECT = "direct", "Direct"


class Conversation(models.Model):
    """A channel, or a direct conversation between named people, in a space."""

    space = models.ForeignKey(
        Space, on_delete=models.PROTECT, related_name="conversations"
    )
    kind = models.CharField(max_length=16, choices=ConversationKind.choices)
    # A channel's name. A direct conversation is named by its people.
    name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
    )

    def __str__(self) -> str:
        return self.name or f"direct {self.pk}"


class Participant(models.Model):
    """One person in a direct conversation. Channels have none: their space's
    members are their people."""

    conversation = models.ForeignKey(
        Conversation, on_delete=models.PROTECT, related_name="participants"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="conversation_participations",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="conversations_participant_once",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.conversation}"


class Message(models.Model):
    """One message, kept for good.

    Append-only: a trigger in this app's first migration makes Postgres
    refuse every ``UPDATE``, ``DELETE`` and ``TRUNCATE``. A correction is a
    new message whose ``amends`` names the one it corrects.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.PROTECT, related_name="messages"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    amends = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="amendments",
    )
    # The message this one replies to, for a reply in a thread. Always a
    # top-level message: a reply to a reply joins the same thread.
    thread = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="replies",
    )
    format_version = models.PositiveSmallIntegerField(
        default=MESSAGE_FORMAT_VERSION
    )
    protection = models.CharField(max_length=64, default=PROTECTION_NONE)

    class Meta:
        indexes = [
            models.Index(
                fields=["conversation", "created_at"],
                name="conversations_message_order",
            ),
        ]

    def __str__(self) -> str:
        return f"message {self.pk} in {self.conversation_id}"
