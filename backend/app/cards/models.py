"""A living card in a conversation, and the events that made it what it is.

A card is one item in a conversation that changes as the thing it follows
changes, such as a pipeline run going from running to failed. The card's
row holds where things stand now, and is updated in place. Its events are
the record of how it got there, kept for good: a trigger in this app's
first migration makes Postgres refuse every change to them, as it does for
messages. So the card's state can always be rebuilt from its events.
"""

from django.db import models
from django.utils import timezone

from app.conversations.models import Conversation


class Card(models.Model):
    """One thing a conversation follows, as it stands now.

    The kind names the module that understands it, and the key names the
    thing within that kind, such as a pipeline run's id, so the next event
    about the same thing finds the same card.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.PROTECT, related_name="cards"
    )
    kind = models.CharField(max_length=64)
    key = models.CharField(max_length=200)
    title = models.CharField(max_length=200)
    # Where things stand, in the shape the card's kind decides.
    state = models.JSONField(default=dict)
    # Whether the card needs somebody now, as its kind judged the last event.
    needs_attention = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "kind", "key"], name="cards_card_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.kind} card {self.key}"


class CardEvent(models.Model):
    """One thing that happened to a card, kept for good. Append-only."""

    card = models.ForeignKey(
        Card, on_delete=models.PROTECT, related_name="events"
    )
    # The event as its kind accepted it.
    data = models.JSONField()
    # One line saying what happened, in the card's thread.
    summary = models.CharField(max_length=300)
    notified = models.BooleanField(default=False)
    received_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"Event {self.pk} on card {self.card_id}"
