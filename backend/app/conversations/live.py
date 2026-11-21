"""Live delivery: each new message reaches every open app at once.

An open app holds one server-sent events stream, ``GET /api/events``.
Posting a message sends a Postgres ``NOTIFY`` naming only the conversation,
never the text, and every open stream wakes. Each stream then reads, with
the same access rules as everything else, the messages its person may read
that are newer than the last one it sent, so a person outside a space
receives nothing from it.

Postgres carries the wake-up, so every Gunicorn worker hears every post and
nothing else, such as Redis, is needed. A stream that drops reconnects with
the id of the last event it had, and is sent everything after it, so a
missed wake-up or a lost connection loses no message.
"""

import json
import time
from collections.abc import Callable, Iterator
from typing import Protocol

import psycopg
from django.db import connection, connections
from django.db.models import Q, QuerySet

from app.accounts.models import User
from app.conversations.models import ConversationKind, Message

#: The Postgres channel posts are announced on.
CHANNEL = "juttu_messages"

#: How long a quiet stream waits before sending a comment, so proxies and
#: phones keep the connection open and a closed account is noticed.
HEARTBEAT_SECONDS = 15.0

#: How long one stream stays open. The app reconnects by itself, from the
#: last event it had, so a stream ending loses nothing; it frees the thread
#: and makes a changed session count within minutes.
STREAM_SECONDS = 300.0

#: How many messages are read at once when catching up.
BATCH = 100

#: How long the browser waits before reconnecting, in milliseconds.
RETRY_MS = 3000

#: Serialises message inserts across every worker, so ids commit in order
#: and a stream reading "everything after id N" never skips one that
#: committed late. Any fixed number works; this one spells "juttu".
POST_LOCK = 0x6A75747475


def hold_post_lock() -> None:
    """Take the lock that keeps message ids committing in order.

    Held until the transaction ends. Posting is short and the team small,
    so the queue it makes is never felt.
    """
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [POST_LOCK])


def announce(conversation_id: int) -> None:
    """Wake every open stream. Postgres sends it when the post commits.

    The payload is the conversation's id and nothing more: a message's
    text never passes through the channel.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT pg_notify(%s, %s)", [CHANNEL, str(conversation_id)]
        )


class Waiter(Protocol):
    """Something a stream sleeps on until a post may have arrived."""

    def wait(self, timeout: float) -> bool:
        """Sleep up to *timeout* seconds; True if woken by a post."""
        ...

    def close(self) -> None:
        """Let go of whatever it holds."""
        ...


class PostgresWaiter:
    """Listens on :data:`CHANNEL`, on a connection of its own.

    Its own, because Django's connection is busy reading messages between
    waits, and runs its queries in the request's thread.
    """

    def __init__(self) -> None:
        settings = connections["default"].settings_dict
        self._connection = psycopg.connect(
            host=settings["HOST"],
            port=settings["PORT"] or None,
            dbname=settings["NAME"],
            user=settings["USER"],
            password=settings["PASSWORD"],
            autocommit=True,
        )
        self._connection.execute(f"LISTEN {CHANNEL}")

    def wait(self, timeout: float) -> bool:
        woken = False

        for _ in self._connection.notifies(timeout=timeout, stop_after=1):
            woken = True

        return woken

    def close(self) -> None:
        self._connection.close()


#: What a stream opens to wait on. Tests replace it with a stand-in.
open_waiter: Callable[[], Waiter] = PostgresWaiter


def readable_messages(user: User) -> QuerySet[Message]:
    """Every message *user* may read now, across all their spaces.

    The same rule as ``can_read``, in one query: the conversation's space
    is one they are in today, and it is a channel or they take part in it.
    """
    return (
        Message.objects.filter(
            conversation__space__memberships__user=user,
            conversation__space__memberships__left_at__isnull=True,
        )
        .filter(
            Q(conversation__kind=ConversationKind.CHANNEL)
            | Q(conversation__participants__user=user)
        )
        .distinct()
    )


def messages_after(
    user: User, after: int, limit: int = BATCH
) -> list[Message]:
    """The messages *user* may read with an id above *after*, oldest first."""
    return list(
        readable_messages(user)
        .filter(pk__gt=after)
        .select_related("author", "conversation")
        .order_by("pk")[:limit]
    )


def latest_message_id() -> int:
    """The newest message's id, or 0 when there are none."""
    newest = Message.objects.order_by("-pk").values_list("pk", flat=True)

    return newest.first() or 0


def event(name: str, event_id: int, data: object) -> str:
    """One server-sent event, as the stream writes it."""
    return f"id: {event_id}\nevent: {name}\ndata: {json.dumps(data)}\n\n"


def stream(
    user_id: int,
    after: int | None,
    *,
    describe: Callable[[Message], dict[str, object]],
    still_signed_in: Callable[[], bool],
    clock: Callable[[], float] = time.monotonic,
) -> Iterator[str]:
    """The events one open app receives, until the stream's time is up.

    *after* is the last message id the app had, from a reconnection; with
    none, the stream starts from now. It ends early once the person's
    account is closed or their session has ended.
    """
    # Listen before the first read, so a post between the two still wakes
    # the stream.
    waiter = open_waiter()

    try:
        last = after if after is not None else latest_message_id()
        deadline = clock() + STREAM_SECONDS

        yield f"retry: {RETRY_MS}\n\n"
        yield event("ready", last, {})

        while True:
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if user is None or not still_signed_in():
                return

            while True:
                found = messages_after(user, last)
                for message in found:
                    last = message.pk
                    yield event(
                        "message",
                        last,
                        {
                            "conversation": message.conversation_id,
                            "space": message.conversation.space_id,
                            "message": describe(message),
                        },
                    )

                if len(found) < BATCH:
                    break

            remaining = deadline - clock()
            if remaining <= 0:
                return

            if not waiter.wait(min(HEARTBEAT_SECONDS, remaining)):
                yield ": still here\n\n"
    finally:
        waiter.close()
