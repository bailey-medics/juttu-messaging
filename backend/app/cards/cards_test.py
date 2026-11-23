"""The card core, proved with a kind of card that exists only here."""

from collections.abc import Callable, Iterator, Mapping

import pytest
from django.db import DatabaseError, transaction
from django.test import Client
from pytest_django.fixtures import Settings as DjangoSettings

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.cards import kinds
from app.cards.kinds import CardKind, EventRefused, JsonObject, Update
from app.cards.models import Card, CardEvent
from app.cards.services import receive
from app.config import PushKeys
from app.conversations.models import Conversation
from app.conversations.services import start_channel, start_direct
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.push import services as push
from app.push.models import NotificationSetting, NotifyLevel
from app.push.services import Push, deliver_card, looking, subscribe
from app.spaces.models import Space
from app.spaces.services import add_to_space, create_space

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"

KEYS = PushKeys(
    public="B" + "A" * 86,
    private="c" * 43,
    contact="mailto:team@juttu.example",
)


class BuildKind(CardKind):
    """A made-up kind: a build that runs, then passes or fails.

    It notifies only when a build fails, as the CI kind in Phase 22 will.
    """

    name = "test-build"

    def accept(self, event: Mapping[str, object]) -> tuple[str, JsonObject]:
        build = event.get("build")
        status = event.get("status")
        if not isinstance(build, str) or status not in (
            "running",
            "passed",
            "failed",
        ):
            raise EventRefused("A build event names its build and status.")

        return build, {"build": build, "status": status}

    def apply(self, state: JsonObject | None, event: JsonObject) -> Update:
        runs = 0 if state is None else int(str(state.get("runs", 0)))
        status = str(event["status"])

        return Update(
            title=f"Build {event['build']}",
            state={"status": status, "runs": runs + 1},
            summary=status.capitalize(),
            notify=status == "failed",
        )


@pytest.fixture(autouse=True)
def build_kind() -> Iterator[BuildKind]:
    kind = BuildKind()
    kinds.register(kind)

    yield kind

    kinds.unregister(kind.name)


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
def release(sam: User, alex: User, priya: User) -> Space:
    space = create_space(
        the_organisation(), "Release", is_clinical=False, by=sam
    )
    add_to_space(space, alex, by=sam)
    add_to_space(space, priya, by=sam)

    return space


@pytest.fixture
def builds(sam: User, release: Space) -> Conversation:
    return start_channel(release, "builds", by=sam)


def build(number: str, status: str) -> dict[str, object]:
    return {"build": number, "status": status}


class TestReceiving:
    def test_the_first_event_creates_the_card(
        self, builds: Conversation
    ) -> None:
        event = receive(builds, "test-build", build("41", "running"))

        card = Card.objects.get()
        assert (card.kind, card.key, card.title) == (
            "test-build",
            "41",
            "Build 41",
        )
        assert card.state == {"status": "running", "runs": 1}
        assert card.needs_attention is False
        assert (event.card, event.summary) == (card, "Running")

    def test_a_later_event_updates_the_same_card_in_place(
        self, builds: Conversation
    ) -> None:
        receive(builds, "test-build", build("41", "running"))
        receive(builds, "test-build", build("41", "failed"))

        card = Card.objects.get()
        assert card.state == {"status": "failed", "runs": 2}
        assert card.needs_attention is True
        assert [e.summary for e in card.events.order_by("pk")] == [
            "Running",
            "Failed",
        ]

    def test_another_thing_gets_its_own_card(
        self, builds: Conversation
    ) -> None:
        receive(builds, "test-build", build("41", "running"))
        receive(builds, "test-build", build("42", "running"))

        assert sorted(Card.objects.values_list("key", flat=True)) == [
            "41",
            "42",
        ]

    def test_an_event_never_becomes_a_message(
        self, builds: Conversation
    ) -> None:
        receive(builds, "test-build", build("41", "running"))

        assert builds.messages.count() == 0

    def test_each_event_is_audited_without_what_it_said(
        self, builds: Conversation
    ) -> None:
        event = receive(builds, "test-build", build("41", "failed"))

        entry = AuditEvent.objects.get(action=AuditAction.CARD_EVENT_RECEIVED)
        assert entry.detail == {
            "card": event.card_id,
            "event": event.pk,
            "kind": "test-build",
        }

    def test_an_event_its_kind_refuses_changes_nothing(
        self, builds: Conversation
    ) -> None:
        with pytest.raises(EventRefused):
            receive(builds, "test-build", {"build": "41", "status": "lost"})

        assert Card.objects.count() == 0
        assert CardEvent.objects.count() == 0

    def test_an_unknown_kind_is_refused(self, builds: Conversation) -> None:
        with pytest.raises(EventRefused, match="no kind of card"):
            receive(builds, "no-such-kind", build("41", "running"))

    def test_a_card_event_is_kept_for_good(self, builds: Conversation) -> None:
        event = receive(builds, "test-build", build("41", "running"))

        with pytest.raises(DatabaseError, match="append-only"):
            with transaction.atomic():
                CardEvent.objects.filter(pk=event.pk).update(summary="Changed")

        with pytest.raises(DatabaseError, match="append-only"):
            with transaction.atomic():
                CardEvent.objects.filter(pk=event.pk).delete()


class TestKinds:
    def test_a_name_is_registered_once(self, build_kind: BuildKind) -> None:
        kinds.register(build_kind)

        with pytest.raises(ValueError, match="exists already"):
            kinds.register(BuildKind())

    def test_a_kind_is_found_by_its_name(self, build_kind: BuildKind) -> None:
        assert kinds.kind_named("test-build") is build_kind
        assert kinds.kind_named("nothing-here") is None


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


class TestReading:
    def test_a_reader_sees_each_card_with_its_thread(
        self, alex: User, builds: Conversation
    ) -> None:
        receive(builds, "test-build", build("41", "running"))
        receive(builds, "test-build", build("41", "passed"))

        response = signed_in(alex).get(f"/api/conversations/{builds.pk}/cards")

        assert response.status_code == 200
        (card,) = response.json()["cards"]
        assert card["title"] == "Build 41"
        assert card["state"] == {"status": "passed", "runs": 2}
        assert card["needs_attention"] is False
        assert [e["summary"] for e in card["events"]] == ["Running", "Passed"]

    def test_somebody_who_cannot_read_the_conversation_gets_not_found(
        self, sam: User, alex: User, priya: User, release: Space
    ) -> None:
        direct = start_direct(release, [alex], by=sam)
        receive(direct, "test-build", build("41", "running"))

        response = signed_in(priya).get(
            f"/api/conversations/{direct.pk}/cards"
        )

        assert response.status_code == 404

    def test_somebody_signed_out_sees_nothing(
        self, client: Client, builds: Conversation
    ) -> None:
        response = client.get(f"/api/conversations/{builds.pk}/cards")

        assert response.status_code == 403


Sent = list[tuple[str, Push]]


class TestNotifying:
    @pytest.fixture(autouse=True)
    def push_on(self, settings: DjangoSettings) -> None:
        settings.PUSH_KEYS = KEYS

    @pytest.fixture
    def sent(
        self,
        monkeypatch: pytest.MonkeyPatch,
        sam: User,
        alex: User,
        priya: User,
    ) -> Sent:
        found: Sent = []

        def stand_in(
            subscription: object, push_: Push, keys: PushKeys
        ) -> bool:
            found.append((getattr(subscription, "endpoint", ""), push_))

            return True

        monkeypatch.setattr(push, "sender", stand_in)
        for user in (sam, alex, priya):
            subscribe(
                user,
                f"https://fcm.googleapis.com/fcm/send/{user.username}",
                "B" + "x" * 86,
                "y" * 22,
            )

        return found

    def test_a_card_that_needs_somebody_starts_a_push_once_committed(
        self,
        monkeypatch: pytest.MonkeyPatch,
        django_capture_on_commit_callbacks: Callable[..., object],
        builds: Conversation,
    ) -> None:
        started: list[int] = []
        monkeypatch.setattr(push, "start_card", started.append)

        with django_capture_on_commit_callbacks(execute=True):  # type: ignore[attr-defined]
            receive(builds, "test-build", build("41", "running"))
            failed = receive(builds, "test-build", build("41", "failed"))

        assert started == [failed.pk]

    def test_everybody_who_may_read_it_is_pushed_even_when_quiet(
        self, sent: Sent, builds: Conversation
    ) -> None:
        event = receive(builds, "test-build", build("41", "failed"))

        deliver_card(event.pk)

        assert sorted(address.rsplit("/", 1)[1] for address, _ in sent) == [
            "alex",
            "priya",
            "sam",
        ]
        assert sent[0][1] == Push(
            title="Build 41",
            body="Failed",
            url=f"/conversations/{builds.pk}",
            tag=f"card-{event.card_id}",
        )

    def test_nobody_who_chose_nothing_or_is_looking_is_pushed(
        self, sent: Sent, alex: User, priya: User, builds: Conversation
    ) -> None:
        NotificationSetting.objects.create(
            user=alex, level=NotifyLevel.NOTHING
        )
        looking(priya, builds, now=True)
        event = receive(builds, "test-build", build("41", "failed"))

        deliver_card(event.pk)

        assert [address.rsplit("/", 1)[1] for address, _ in sent] == ["sam"]

    def test_a_card_event_that_needs_nobody_is_never_pushed(
        self, sent: Sent, builds: Conversation
    ) -> None:
        event = receive(builds, "test-build", build("41", "passed"))

        deliver_card(event.pk)

        assert sent == []
