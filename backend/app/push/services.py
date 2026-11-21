"""Storing subscriptions, and sending a push when a message arrives.

A push goes to everybody else who may read the message, from a background
thread once the message is committed, so a slow push service never holds
up posting. It names the conversation and who wrote, and links to the
conversation, but never carries the message's text: a push passes through
Google's, Apple's or Mozilla's servers on its way to the phone.
"""

import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass

from django.conf import settings
from django.db import connection, transaction
from django.db.models import QuerySet
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.config import PushKeys
from app.conversations.models import ConversationKind, Message
from app.push.models import PushSubscription
from app.spaces.services import members_of

logger = logging.getLogger(__name__)

#: How long a push service keeps a push for a phone that is off: twelve
#: hours, so one sent overnight still arrives in the morning.
TIME_TO_LIVE_SECONDS = 12 * 60 * 60

#: How long to wait for a push service to answer.
TIMEOUT_SECONDS = 10

#: The answers a push service gives for a subscription that has gone.
GONE = frozenset({404, 410})


@dataclass(frozen=True)
class Push:
    """One notification, as the phone's service worker reads it."""

    title: str
    body: str
    url: str
    #: Pushes with the same tag replace each other on the phone, so a busy
    #: conversation shows one notification, not one for each message.
    tag: str

    def payload(self) -> str:
        return json.dumps(
            {
                "title": self.title,
                "body": self.body,
                "tag": self.tag,
                "data": {"url": self.url},
            }
        )


@transaction.atomic
def subscribe(
    user: User, endpoint: str, p256dh: str, auth: str
) -> PushSubscription:
    """Store *user*'s subscription, or bring an existing one up to date.

    The endpoint names one browser, so if somebody else had it, such as on a
    shared computer, it now belongs to *user*.
    """
    subscription, created = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={"user": user, "p256dh": p256dh, "auth": auth},
    )

    if created:
        record(
            AuditAction.PUSH_SUBSCRIBED,
            actor=user,
            detail={"subscription": subscription.pk},
        )

    return subscription


@transaction.atomic
def forget(user: User, endpoint: str) -> None:
    """Remove *user*'s subscription at *endpoint*, if they have one."""
    found = PushSubscription.objects.filter(
        user=user, endpoint=endpoint
    ).first()
    if found is None:
        return

    pk = found.pk
    found.delete()

    record(
        AuditAction.PUSH_UNSUBSCRIBED,
        actor=user,
        detail={"subscription": pk},
    )


def recipients(message: Message) -> QuerySet[User]:
    """Everybody who may read *message*, except the person who wrote it."""
    conversation = message.conversation
    people = members_of(conversation.space).exclude(pk=message.author_id)

    if conversation.kind == ConversationKind.DIRECT:
        people = people.filter(
            conversation_participations__conversation=conversation
        )

    return people


def push_for(message: Message) -> Push:
    """The notification about *message*. Never its text."""
    conversation = message.conversation
    author = message.author.display_name

    if conversation.kind == ConversationKind.CHANNEL:
        title = f"{conversation.name} in {conversation.space.name}"
        body = f"{author} sent a message"
    else:
        title = author
        body = "Sent you a message"

    return Push(
        title=title,
        body=body,
        url=f"/conversations/{conversation.pk}",
        tag=f"conversation-{conversation.pk}",
    )


def send_one(
    subscription: PushSubscription, push: Push, keys: PushKeys
) -> bool:
    """Send *push* to one browser. False if its subscription has gone."""
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=push.payload(),
            vapid_private_key=keys.private,
            vapid_claims={"sub": keys.contact},
            ttl=TIME_TO_LIVE_SECONDS,
            timeout=TIMEOUT_SECONDS,
            headers={"Urgency": "normal", "Topic": push.tag},
        )
    except WebPushException as error:
        status = getattr(error.response, "status_code", None)
        if status in GONE:
            return False

        # Only the status: the address names one browser.
        logger.warning("A push was not accepted: status %s", status)

    return True


#: What sends one push. Tests replace it with a stand-in.
sender: Callable[[PushSubscription, Push, PushKeys], bool] = send_one


def deliver(message_id: int) -> None:
    """Send the push about one message to every browser that should have it.

    A subscription the push service says has gone is deleted, so it is not
    tried again.
    """
    keys = settings.PUSH_KEYS
    message = (
        Message.objects.select_related("conversation__space", "author")
        .filter(pk=message_id)
        .first()
    )
    if keys is None or message is None:
        return

    push = push_for(message)
    subscriptions = PushSubscription.objects.filter(
        user__in=recipients(message)
    )

    gone = [s.pk for s in subscriptions if not sender(s, push, keys)]

    if gone:
        PushSubscription.objects.filter(pk__in=gone).delete()


def _deliver_in_background(message_id: int) -> None:
    try:
        deliver(message_id)
    finally:
        # The thread opened its own database connection; this closes it.
        connection.close()


def start_in_background(message_id: int) -> None:
    """Deliver from a thread of its own, so posting does not wait."""
    threading.Thread(
        target=_deliver_in_background,
        args=(message_id,),
        name=f"push-{message_id}",
        daemon=True,
    ).start()


#: How a delivery is started. Tests run it in their own thread instead.
start: Callable[[int], None] = start_in_background


def notify_about(message: Message) -> None:
    """Push *message* to its readers once it is committed, if push is on."""
    if settings.PUSH_KEYS is None:
        return

    message_id = message.pk
    transaction.on_commit(lambda: start(message_id))
