"""The inlet: senders, their secrets, and the events they send."""

from typing import TYPE_CHECKING

import pytest
from django.test import Client

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.cards.models import Card, CardEvent
from app.conversations.models import Conversation
from app.conversations.services import start_channel, start_direct
from app.inlet.models import Sender
from app.inlet.services import Registered, register
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space
from app.spaces.services import add_to_space, create_space

if TYPE_CHECKING:
    from django.test.client import _MonkeyPatchedWSGIResponse as TestResponse

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


@pytest.fixture
def sam() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def alex() -> User:
    user = User.objects.create_user("alex", PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def release(sam: User, alex: User) -> Space:
    space = create_space(
        the_organisation(), "Release", is_clinical=False, by=sam
    )
    add_to_space(space, alex, by=sam)

    return space


@pytest.fixture
def deploys(sam: User, release: Space) -> Conversation:
    return start_channel(release, "deploys", by=sam)


@pytest.fixture
def made(sam: User, deploys: Conversation) -> Registered:
    return register("Deploys", deploys, by=sam)


def deploy_event(**changes: object) -> dict[str, object]:
    return {
        "key": "deploy-1",
        "title": "Deploy 6ac7958",
        "line": "Deploying",
        "needs_somebody": False,
        **changes,
    }


def send(
    secret: str | None, event: object, client: Client | None = None
) -> TestResponse:
    headers = {} if secret is None else {"Authorization": f"Bearer {secret}"}

    return (client or Client()).post(
        "/api/inlet/events",
        event,
        content_type="application/json",
        headers=headers,
    )


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


class TestEvents:
    def test_an_event_creates_its_card_and_a_later_one_updates_it(
        self, made: Registered, deploys: Conversation
    ) -> None:
        first = send(made.secret, deploy_event())
        second = send(
            made.secret, deploy_event(line="Deployed", needs_somebody=True)
        )

        assert (first.status_code, second.status_code) == (202, 202)
        card = Card.objects.get()
        assert card.conversation == deploys
        assert card.kind == "outside"
        assert card.title == "Deploy 6ac7958"
        assert card.state == {"line": "Deployed", "needs_somebody": True}
        assert card.needs_attention is True
        assert [e.summary for e in card.events.order_by("pk")] == [
            "Deploying",
            "Deployed",
        ]

    def test_an_event_never_becomes_a_message(
        self, made: Registered, deploys: Conversation
    ) -> None:
        send(made.secret, deploy_event())

        assert deploys.messages.count() == 0

    def test_two_senders_keep_their_own_cards_under_one_key(
        self, sam: User, made: Registered, deploys: Conversation
    ) -> None:
        other = register("Builds", deploys, by=sam)

        send(made.secret, deploy_event())
        send(other.secret, deploy_event(sender=made.sender.pk))

        assert Card.objects.count() == 2
        keys = sorted(Card.objects.values_list("key", flat=True))
        assert keys == [
            f"{made.sender.pk}:deploy-1",
            f"{other.sender.pk}:deploy-1",
        ]

    @pytest.mark.parametrize(
        "secret",
        [
            None,
            "",
            "not-a-secret",
            "999.some-random-part",
        ],
    )
    def test_an_unknown_secret_changes_nothing(
        self, made: Registered, secret: str | None
    ) -> None:
        response = send(secret, deploy_event())

        assert response.status_code == 401
        assert response.headers["WWW-Authenticate"] == "Bearer"
        assert CardEvent.objects.count() == 0

    def test_the_right_sender_with_the_wrong_random_part_is_refused(
        self, made: Registered
    ) -> None:
        wrong = f"{made.sender.pk}.{'x' * 43}"

        assert send(wrong, deploy_event()).status_code == 401
        assert CardEvent.objects.count() == 0

    def test_a_closed_sender_s_secret_stops_working(
        self, sam: User, made: Registered
    ) -> None:
        signed_in(sam).post(f"/api/inlet/senders/{made.sender.pk}/close")

        assert send(made.secret, deploy_event()).status_code == 401

    @pytest.mark.parametrize(
        ("event", "reason"),
        [
            (deploy_event(title=""), "'title'"),
            (deploy_event(line="x" * 301), "longer than 300"),
            (deploy_event(needs_somebody="yes"), "true or false"),
            (deploy_event(colour="red"), "cannot carry colour"),
            ({"title": "t", "line": "l"}, "'key'"),
            (["not", "an", "object"], "one JSON object"),
        ],
    )
    def test_an_event_of_the_wrong_shape_is_refused_with_the_reason(
        self, made: Registered, event: object, reason: str
    ) -> None:
        response = send(made.secret, event)

        assert response.status_code == 400
        assert reason in response.json()["detail"]
        assert CardEvent.objects.count() == 0

    def test_a_reader_of_the_channel_sees_the_card(
        self, alex: User, made: Registered, deploys: Conversation
    ) -> None:
        send(made.secret, deploy_event())

        response = signed_in(alex).get(
            f"/api/conversations/{deploys.pk}/cards"
        )

        (card,) = response.json()["cards"]
        assert card["title"] == "Deploy 6ac7958"


class TestSenders:
    def test_an_admin_registers_a_sender_and_sees_its_secret_once(
        self, sam: User, deploys: Conversation
    ) -> None:
        client = signed_in(sam)

        response = client.post(
            "/api/inlet/senders",
            {"name": "  Deploys  ", "channel": deploys.pk},
            content_type="application/json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "Deploys"
        assert body["channel"]["id"] == deploys.pk
        assert body["secret"].startswith(f"{body['id']}.")
        listed = client.get("/api/inlet/senders").json()["senders"]
        assert [s["name"] for s in listed] == ["Deploys"]
        assert "secret" not in listed[0]

    def test_only_a_hash_of_the_secret_is_kept(self, made: Registered) -> None:
        random_part = made.secret.split(".", 1)[1]

        stored = Sender.objects.get().secret_hash

        assert random_part not in stored
        assert stored.startswith(("pbkdf2", "argon2", "scrypt", "bcrypt"))

    def test_registering_moving_and_closing_are_audited(
        self, sam: User, release: Space, made: Registered
    ) -> None:
        client = signed_in(sam)
        other = start_channel(release, "builds", by=sam)

        client.post(
            f"/api/inlet/senders/{made.sender.pk}/channel",
            {"channel": other.pk},
            content_type="application/json",
        )
        client.post(f"/api/inlet/senders/{made.sender.pk}/close")

        actions = list(
            AuditEvent.objects.filter(action__startswith="sender_")
            .order_by("pk")
            .values_list("action", flat=True)
        )
        assert actions == [
            AuditAction.SENDER_REGISTERED,
            AuditAction.SENDER_CHANNEL_CHANGED,
            AuditAction.SENDER_CLOSED,
        ]
        assert Sender.objects.get().conversation == other

    def test_a_moved_sender_s_next_card_lands_in_its_new_channel(
        self, sam: User, release: Space, made: Registered
    ) -> None:
        other = start_channel(release, "builds", by=sam)
        signed_in(sam).post(
            f"/api/inlet/senders/{made.sender.pk}/channel",
            {"channel": other.pk},
            content_type="application/json",
        )

        send(made.secret, deploy_event())

        assert Card.objects.get().conversation == other

    def test_a_sender_s_cards_land_only_in_a_channel(
        self, sam: User, alex: User, release: Space
    ) -> None:
        direct = start_direct(release, [alex], by=sam)

        response = signed_in(sam).post(
            "/api/inlet/senders",
            {"name": "Deploys", "channel": direct.pk},
            content_type="application/json",
        )

        assert response.status_code == 400
        assert Sender.objects.count() == 0

    def test_the_channels_on_offer_are_every_channel_and_no_direct_one(
        self, sam: User, alex: User, deploys: Conversation
    ) -> None:
        elsewhere = create_space(
            the_organisation(), "Design", is_clinical=False, by=sam
        )
        ideas = start_channel(elsewhere, "ideas", by=sam)
        start_direct(deploys.space, [alex], by=sam)

        found = signed_in(sam).get("/api/inlet/channels").json()["channels"]

        assert [c["id"] for c in found] == [ideas.pk, deploys.pk]
        assert found[0]["space"]["name"] == "Design"

    @pytest.mark.parametrize(
        ("method", "path"),
        [
            ("get", "/api/inlet/senders"),
            ("post", "/api/inlet/senders"),
            ("get", "/api/inlet/channels"),
            ("post", "/api/inlet/senders/1/close"),
            ("post", "/api/inlet/senders/1/channel"),
        ],
    )
    def test_only_an_admin_manages_senders(
        self, alex: User, method: str, path: str
    ) -> None:
        member = getattr(signed_in(alex), method)(path)
        nobody = getattr(Client(), method)(path)

        assert member.status_code == 403
        assert nobody.status_code == 403
