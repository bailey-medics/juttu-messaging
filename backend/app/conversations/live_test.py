"""Live delivery: who receives what, reconnection, and the wake-up."""

import json
from collections.abc import Iterator

import psycopg
import pytest
from django.db import connections
from django.test import Client

from app.accounts.models import User
from app.conversations import live, services
from app.conversations.models import Conversation, Message
from app.conversations.services import post, start_channel, start_direct
from app.conversations.views import message_body
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space
from app.spaces.services import (
    add_to_space,
    create_space,
    remove_from_space,
)

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"

HEARTBEAT = ": still here\n\n"


class StandInWaiter:
    """Never woken: each wait returns at once, as if it timed out."""

    def __init__(self) -> None:
        self.closed = False

    def wait(self, timeout: float) -> bool:
        return False

    def close(self) -> None:
        self.closed = True


@pytest.fixture
def waiter(monkeypatch: pytest.MonkeyPatch) -> StandInWaiter:
    stand_in = StandInWaiter()
    monkeypatch.setattr(live, "open_waiter", lambda: stand_in)

    return stand_in


def person(username: str) -> User:
    user = User.objects.create_user(username, PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def sam() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def alex() -> User:
    return person("alex")


@pytest.fixture
def priya() -> User:
    return person("priya")


@pytest.fixture
def outsider() -> User:
    """In the organisation, but in no space."""
    return person("olu")


@pytest.fixture
def release(sam: User, alex: User, priya: User) -> Space:
    space = create_space(
        the_organisation(), "Release", is_clinical=False, by=sam
    )
    add_to_space(space, alex, by=sam)
    add_to_space(space, priya, by=sam)

    return space


@pytest.fixture
def general(sam: User, release: Space) -> Conversation:
    return start_channel(release, "general", by=sam)


def stream_for(
    user: User, after: int | None = None, *, signed_in: bool = True
) -> Iterator[str]:
    return live.stream(
        user.pk,
        after,
        describe=message_body,
        still_signed_in=lambda: signed_in,
    )


def opened(events: Iterator[str]) -> int:
    """Read the stream's opening, and hand back the id it starts from."""
    assert next(events) == f"retry: {live.RETRY_MS}\n\n"
    ready = next(events)
    assert "event: ready" in ready

    return int(ready.split("\n")[0].removeprefix("id: "))


def data_of(text: str) -> dict[str, object]:
    line = next(x for x in text.split("\n") if x.startswith("data: "))
    found = json.loads(line.removeprefix("data: "))
    assert isinstance(found, dict)

    return found


class TestDelivery:
    def test_a_new_message_reaches_a_member(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        events = stream_for(alex)
        opened(events)

        sent = post(general, "Release at four", by=sam)
        arrived = next(events)

        assert arrived.startswith(f"id: {sent.pk}\nevent: message\n")
        assert data_of(arrived) == {
            "conversation": general.pk,
            "space": general.space_id,
            "message": message_body(sent),
        }

    def test_a_reply_in_a_thread_arrives_with_its_thread(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        first = post(general, "Release at four", by=sam)
        events = stream_for(alex)
        opened(events)

        post(general, "Fine by me", by=alex, thread=first)
        message = data_of(next(events))["message"]

        assert isinstance(message, dict)
        assert message["thread"] == first.pk

    def test_a_stream_starts_from_now(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        earlier = post(general, "Already read", by=sam)
        events = stream_for(alex)

        assert opened(events) == earlier.pk
        assert next(events) == HEARTBEAT


class TestNothingForOthers:
    def test_somebody_outside_the_space_receives_nothing(
        self,
        waiter: StandInWaiter,
        sam: User,
        outsider: User,
        general: Conversation,
    ) -> None:
        events = stream_for(outsider)
        opened(events)

        post(general, "Members only", by=sam)

        assert next(events) == HEARTBEAT

    def test_a_direct_conversation_reaches_only_its_people(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        priya: User,
        release: Space,
    ) -> None:
        direct = start_direct(release, [alex], by=sam)
        for_priya = stream_for(priya)
        for_alex = stream_for(alex)
        opened(for_priya)
        opened(for_alex)

        post(direct, "Just us", by=sam)

        assert next(for_priya) == HEARTBEAT
        assert "event: message" in next(for_alex)

    def test_somebody_who_left_the_space_receives_nothing(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        events = stream_for(alex)
        opened(events)
        remove_from_space(general.space, alex, by=sam)

        post(general, "After you left", by=sam)

        assert next(events) == HEARTBEAT


class TestReconnection:
    def test_a_reconnection_gets_everything_after_its_last_id(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        seen = post(general, "Seen before the drop", by=sam)
        missed = [
            post(general, "Missed one", by=sam),
            post(general, "Missed two", by=sam),
        ]

        events = stream_for(alex, after=seen.pk)
        assert opened(events) == seen.pk
        arrived = [next(events), next(events)]

        assert [data_of(e)["message"] for e in arrived] == [
            message_body(m) for m in missed
        ]
        assert next(events) == HEARTBEAT

    def test_a_long_gap_is_caught_up_in_batches(
        self,
        waiter: StandInWaiter,
        monkeypatch: pytest.MonkeyPatch,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        monkeypatch.setattr(live, "BATCH", 2)
        sent = [post(general, f"Message {n}", by=sam) for n in range(5)]

        events = stream_for(alex, after=0)
        opened(events)
        arrived = [next(events) for _ in sent]

        assert [e.split("\n")[0] for e in arrived] == [
            f"id: {m.pk}" for m in sent
        ]


class TestEnding:
    def test_it_ends_when_the_account_is_closed(
        self, waiter: StandInWaiter, alex: User, general: Conversation
    ) -> None:
        events = stream_for(alex)
        opened(events)
        User.objects.filter(pk=alex.pk).update(is_active=False)

        assert list(events) == []
        assert waiter.closed

    def test_it_ends_when_the_session_has_ended(
        self, waiter: StandInWaiter, alex: User, general: Conversation
    ) -> None:
        events = stream_for(alex, signed_in=False)
        opened(events)

        assert list(events) == []

    def test_it_ends_when_its_time_is_up(
        self, waiter: StandInWaiter, alex: User, general: Conversation
    ) -> None:
        ticks = iter([0.0, live.STREAM_SECONDS + 1])
        events = live.stream(
            alex.pk,
            None,
            describe=message_body,
            still_signed_in=lambda: True,
            clock=lambda: next(ticks),
        )
        opened(events)

        assert list(events) == []
        assert waiter.closed


class TestWakeUp:
    def test_posting_announces_the_conversation_only(
        self,
        monkeypatch: pytest.MonkeyPatch,
        sam: User,
        general: Conversation,
    ) -> None:
        announced: list[int] = []
        monkeypatch.setattr(services, "announce", announced.append)

        post(general, "Wake up", by=sam)

        assert announced == [general.pk]

    def test_the_waiter_wakes_on_a_notification(self) -> None:
        waiter = live.PostgresWaiter()
        settings = connections["default"].settings_dict
        sender = psycopg.connect(
            host=settings["HOST"],
            port=settings["PORT"] or None,
            dbname=settings["NAME"],
            user=settings["USER"],
            password=settings["PASSWORD"],
            autocommit=True,
        )

        try:
            assert waiter.wait(0.05) is False

            sender.execute("SELECT pg_notify(%s, %s)", [live.CHANNEL, "5"])

            assert waiter.wait(5) is True
        finally:
            sender.close()
            waiter.close()

    def test_announcing_and_the_lock_run_in_a_transaction(self) -> None:
        live.hold_post_lock()
        live.announce(5)

    def test_message_ids_are_read_in_order(
        self, sam: User, general: Conversation
    ) -> None:
        sent = [post(general, f"Message {n}", by=sam) for n in range(3)]

        assert live.messages_after(sam, 0) == sent
        assert live.latest_message_id() == sent[-1].pk
        assert Message.objects.count() == 3


class TestEventsView:
    def test_it_needs_somebody_signed_in(self, client: Client) -> None:
        response = client.get(
            "/api/events", headers={"Accept": "text/event-stream"}
        )

        assert response.status_code == 403

    def test_it_streams_events(
        self, waiter: StandInWaiter, alex: User, general: Conversation
    ) -> None:
        client = Client()
        client.force_login(alex)

        response = client.get(
            "/api/events", headers={"Accept": "text/event-stream"}
        )
        chunks = iter(response.streaming_content)  # type: ignore[attr-defined]

        assert response.status_code == 200
        assert response["Content-Type"] == "text/event-stream"
        assert response["Cache-Control"] == "no-cache"
        assert next(chunks) == f"retry: {live.RETRY_MS}\n\n".encode()
        response.close()

    @pytest.mark.parametrize(
        ("headers", "query", "expected"),
        [
            ({"Last-Event-ID": "{first}"}, "", "second"),
            ({}, "?after={first}", "second"),
        ],
    )
    def test_it_resumes_from_the_last_id(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
        headers: dict[str, str],
        query: str,
        expected: str,
    ) -> None:
        first = post(general, "first", by=sam)
        post(general, "second", by=sam)
        client = Client()
        client.force_login(alex)

        response = client.get(
            "/api/events" + query.format(first=first.pk),
            headers={
                "Accept": "text/event-stream",
                **{k: v.format(first=first.pk) for k, v in headers.items()},
            },
        )
        chunks = iter(response.streaming_content)  # type: ignore[attr-defined]
        next(chunks)
        next(chunks)
        arrived = data_of(next(chunks).decode())["message"]

        assert isinstance(arrived, dict)
        assert arrived["body"] == expected
        response.close()

    def test_a_last_id_that_is_not_a_number_starts_from_now(
        self,
        waiter: StandInWaiter,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        latest = post(general, "before", by=sam)
        client = Client()
        client.force_login(alex)

        response = client.get(
            "/api/events?after=-1",
            headers={"Accept": "text/event-stream", "Last-Event-ID": "x"},
        )
        chunks = iter(response.streaming_content)  # type: ignore[attr-defined]
        next(chunks)
        ready = next(chunks).decode()

        assert ready.startswith(f"id: {latest.pk}\nevent: ready")
        response.close()
