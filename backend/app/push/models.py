"""A browser's subscription to push notifications."""

from django.conf import settings
from django.db import models
from django.utils import timezone

#: Longer than any address a push service issues, and short enough that
#: nobody can store a book in the column. Quill Medical's limit.
MAX_ENDPOINT_LENGTH = 2000


class PushSubscription(models.Model):
    """One browser, on one device, that may be sent a person's pushes.

    The endpoint is the address the browser's push service gave it, and
    names that one browser, so it belongs to one person at a time. The two
    keys encrypt each push so that only that browser can read it.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.CharField(max_length=MAX_ENDPOINT_LENGTH, unique=True)
    p256dh = models.CharField(max_length=100)
    auth = models.CharField(max_length=40)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"Push subscription {self.pk} for user {self.user_id}"


class Looking(models.Model):
    """Somebody has a conversation open, and on screen, until a time.

    The conversation page says so every half minute while it is visible,
    and the mark lapses a minute later, so a phone that was closed or put
    away stops counting without having to say so. Nobody is sent a push
    about a conversation they are looking at.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="+",
    )
    conversation = models.ForeignKey(
        "conversations.Conversation",
        on_delete=models.CASCADE,
        related_name="+",
    )
    until = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "conversation"], name="push_looking_once"
            )
        ]

    def __str__(self) -> str:
        return f"User {self.user_id} looking at {self.conversation_id}"


class NotifyLevel(models.TextChoices):
    """What sends a person a push. Quiet unless they choose otherwise."""

    #: A direct message, or a message that mentions them. The default.
    QUIET = "quiet", "Direct messages and mentions"
    EVERYTHING = "everything", "Every message"
    NOTHING = "nothing", "Nothing"


class NotificationSetting(models.Model):
    """What one person has chosen to be notified about.

    A person with no row is quiet: the default is that messages wait to be
    read, and only what is for them notifies.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_setting",
    )
    level = models.CharField(
        max_length=16, choices=NotifyLevel.choices, default=NotifyLevel.QUIET
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"User {self.user_id} notified about {self.level}"
