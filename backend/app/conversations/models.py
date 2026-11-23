"""A conversation, who is in a direct one, and its messages."""

import secrets

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


class ConversationIcon(models.TextChoices):
    """The friendly Tabler icons a conversation may be given, by name. The
    frontend draws each; a name not here is never sent."""

    ANCHOR = "anchor", "Anchor"
    BOLT = "bolt", "Bolt"
    CLOUD = "cloud", "Cloud"
    COFFEE = "coffee", "Coffee"
    COMPASS = "compass", "Compass"
    FLAME = "flame", "Flame"
    LEAF = "leaf", "Leaf"
    MUSIC = "music", "Music"
    PLANET = "planet", "Planet"
    ROCKET = "rocket", "Rocket"
    STAR = "star", "Star"
    SUN = "sun", "Sun"


#: How many gradients the frontend's profile pictures have, in
#: ``frontend/src/components/profile-pic/gradients.ts``.
ICON_COLOURS = 30


def random_icon() -> str:
    """One of the icons, picked at random, for a new conversation."""
    return secrets.choice(ConversationIcon.values)


def random_icon_colour() -> int:
    """One of the gradients, by its index, picked at random."""
    return secrets.randbelow(ICON_COLOURS)


class Conversation(models.Model):
    """A channel, or a direct conversation between named people, in a space.

    Each has an icon and a colour, picked at random when it is made and
    kept, which Home shows in place of people's circles. ``shows_people``
    lets an organisation admin turn a channel's circles off.
    """

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
    icon = models.CharField(
        max_length=16, choices=ConversationIcon.choices, default=random_icon
    )
    icon_colour = models.PositiveSmallIntegerField(default=random_icon_colour)
    shows_people = models.BooleanField(default=True)

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


class ReadPoint(models.Model):
    """How far one person has read in one conversation.

    The newest message they have seen, and the newest living card, each by
    its id, which only grows. A card counts once, when it is made: a card
    changing in place, such as a run going from "Running" to "Passed", is
    not new to anybody. Unlike a message this row changes, as reading moves
    on; it says what a person has seen, never what anybody said.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.PROTECT, related_name="read_points"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="read_points",
    )
    last_read_message_id = models.BigIntegerField(default=0)
    last_read_card_id = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="conversations_read_point_once",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} read {self.conversation_id} to {self.last_read_message_id}"
