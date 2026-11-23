"""An outside tool allowed to send events, such as the box's deploy script.

A sender proves who it is with a secret on every event. Juttu keeps only a
hash of that secret, made by Django's password hashers, so a copy of the
database gives nobody a working secret.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from app.conversations.models import Conversation


class Sender(models.Model):
    """One outside tool, and the channel its cards land in."""

    name = models.CharField(max_length=100)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.PROTECT, related_name="senders"
    )
    # Django's password hash of the secret's random part. Never the secret.
    secret_hash = models.CharField(max_length=256)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="+",
    )
    # Set once the sender is closed; its secret stops working at once.
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return self.name
