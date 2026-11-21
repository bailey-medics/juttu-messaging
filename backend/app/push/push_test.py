"""Push notifications: subscribing, who is sent what, and the keys."""

import base64
import json
import threading
from collections.abc import Callable
from datetime import timedelta
from io import StringIO
from types import SimpleNamespace

import pytest
from django.core.management import call_command
from django.db import connection
from django.test import Client, override_settings
from django.utils import timezone
from py_vapid import Vapid  # type: ignore[import-untyped]
from pytest_django.fixtures import Settings as DjangoSettings
from pywebpush import WebPushException  # type: ignore[import-untyped]

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.config import PushKeys
from app.conversations.models import Conversation
from app.conversations.services import post, start_channel, start_direct
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.push import services
from app.push.endpoints import is_push_endpoint
from app.push.management.commands.generate_push_keys import key_pair
from app.push.mentions import mentioned_usernames
from app.push.models import (
    Looking,
    NotificationSetting,
    NotifyLevel,
    PushSubscription,
)
from app.push.services import Push, deliver, forget, push_for, subscribe
from app.spaces.models import Space
from app.spaces.services import add_to_space, create_space, remove_from_space

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"

#: Made-up keys in the right shape. Nothing is ever sent with them.
KEYS = PushKeys(
    public="B" + "A" * 86,
    private="c" * 43,
    contact="mailto:team@juttu.example",
)
P256DH = "B" + "x" * 86
AUTH = "y" * 22


def endpoint(name: str) -> str:
    return f"https://fcm.googleapis.com/fcm/send/{name}"


def person(username: str) -> User:
    user = User.objects.create_user(username, PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def sam() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    user.name = "Sam Patel"
    user.save(update_fields=["name"])
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
def general(sam: User, release: Space) -> Conversation:
    return start_channel(release, "general", by=sam)


Sent = list[tuple[str, Push]]


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> Sent:
    """Every push 'sent', by endpoint, with nothing leaving the machine."""
    found: Sent = []

    def stand_in(
        subscription: PushSubscription, push: Push, keys: PushKeys
    ) -> bool:
        assert keys == KEYS
        found.append((subscription.endpoint, push))

        return True

    monkeypatch.setattr(services, "sender", stand_in)

    return found


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def subscription_body(address: str) -> dict[str, object]:
    return {
        "endpoint": address,
        "expirationTime": None,
        "keys": {"p256dh": P256DH, "auth": AUTH},
    }


class TestEndpointCheck:
    @pytest.mark.parametrize(
        "address",
        [
            "https://fcm.googleapis.com/fcm/send/abc",
            "https://updates.push.services.mozilla.com/wpush/v2/abc",
            "https://web.push.apple.com/QGx",
            "https://wns2-par02p.notify.windows.com/w/?token=abc",
            "https://fcm.googleapis.com:443/fcm/send/abc",
        ],
    )
    def test_a_push_service_is_accepted(self, address: str) -> None:
        assert is_push_endpoint(address)

    @pytest.mark.parametrize(
        "address",
        [
            "http://fcm.googleapis.com/fcm/send/abc",
            "https://example.com/fcm/send/abc",
            "https://web.push.apple.com.example/abc",
            "https://example.com\\.push.apple.com/abc",
            "https://fcm.googleapis.com:8443/abc",
            "https://someone:secret@fcm.googleapis.com/abc",
            "https://fcm.googleapis.com/a b",
            "https://127.0.0.1/abc",
            "https://fcm.googleapis.com:notaport/abc",
        ],
    )
    def test_anything_else_is_refused(self, address: str) -> None:
        assert not is_push_endpoint(address)


class TestSubscribing:
    def test_a_browser_subscribes_and_it_is_audited(self, alex: User) -> None:
        response = signed_in(alex).post(
            "/api/push/subscriptions",
            subscription_body(endpoint("alex-phone")),
            content_type="application/json",
        )

        assert response.status_code == 201
        assert response.json() == {"count": 1}
        stored = PushSubscription.objects.get()
        assert (stored.user, stored.p256dh, stored.auth) == (
            alex,
            P256DH,
            AUTH,
        )
        event = AuditEvent.objects.get(action=AuditAction.PUSH_SUBSCRIBED)
        assert event.actor == alex
        assert event.detail == {"subscription": stored.pk}

    def test_subscribing_again_updates_the_keys(self, alex: User) -> None:
        subscribe(alex, endpoint("alex-phone"), P256DH, AUTH)
        subscribe(alex, endpoint("alex-phone"), P256DH, "z" * 22)

        assert PushSubscription.objects.get().auth == "z" * 22
        assert (
            AuditEvent.objects.filter(
                action=AuditAction.PUSH_SUBSCRIBED
            ).count()
            == 1
        )

    def test_a_shared_browser_moves_to_whoever_subscribed_last(
        self, alex: User, priya: User
    ) -> None:
        subscribe(alex, endpoint("shared"), P256DH, AUTH)
        subscribe(priya, endpoint("shared"), P256DH, AUTH)

        assert PushSubscription.objects.get().user == priya

    def test_an_address_that_is_not_a_push_service_is_refused(
        self, alex: User
    ) -> None:
        response = signed_in(alex).post(
            "/api/push/subscriptions",
            subscription_body("https://example.com/collect"),
            content_type="application/json",
        )

        assert response.status_code == 400
        assert PushSubscription.objects.count() == 0

    def test_keys_in_the_wrong_shape_are_refused(self, alex: User) -> None:
        body = subscription_body(endpoint("alex-phone"))
        body["keys"] = {"p256dh": "not base64!", "auth": AUTH}

        response = signed_in(alex).post(
            "/api/push/subscriptions", body, content_type="application/json"
        )

        assert response.status_code == 400

    def test_somebody_signed_out_cannot_subscribe(
        self, client: Client
    ) -> None:
        response = client.post(
            "/api/push/subscriptions",
            subscription_body(endpoint("x")),
            content_type="application/json",
        )

        assert response.status_code == 403

    def test_a_browser_is_forgotten_and_it_is_audited(
        self, alex: User
    ) -> None:
        subscribe(alex, endpoint("alex-phone"), P256DH, AUTH)

        response = signed_in(alex).post(
            "/api/push/subscriptions/remove",
            {"endpoint": endpoint("alex-phone")},
            content_type="application/json",
        )

        assert response.status_code == 204
        assert PushSubscription.objects.count() == 0
        assert AuditEvent.objects.filter(
            action=AuditAction.PUSH_UNSUBSCRIBED, actor=alex
        ).exists()

    def test_nobody_can_forget_somebody_else_s_browser(
        self, alex: User, priya: User
    ) -> None:
        subscribe(alex, endpoint("alex-phone"), P256DH, AUTH)

        forget(priya, endpoint("alex-phone"))

        assert PushSubscription.objects.get().user == alex


class TestTheKey:
    @override_settings(PUSH_KEYS=KEYS)
    def test_the_public_key_is_handed_out(self, alex: User) -> None:
        response = signed_in(alex).get("/api/push/key")

        assert response.json() == {"public_key": KEYS.public}

    @override_settings(PUSH_KEYS=None)
    def test_with_push_off_there_is_no_key(self, alex: User) -> None:
        response = signed_in(alex).get("/api/push/key")

        assert response.json() == {"public_key": None}

    def test_somebody_signed_out_is_not_told(self, client: Client) -> None:
        assert client.get("/api/push/key").status_code == 403


class TestWhoIsSentWhat:
    @pytest.fixture(autouse=True)
    def push_on(
        self, settings: DjangoSettings, alex: User, priya: User
    ) -> None:
        """Push on, and alex and priya told of every message, as Phase 19
        sent them before quiet became the default in Phase 20."""
        settings.PUSH_KEYS = KEYS
        for user in (alex, priya):
            NotificationSetting.objects.create(
                user=user, level=NotifyLevel.EVERYTHING
            )

    def test_everybody_else_in_a_channel_is_sent_a_push(
        self,
        sent: Sent,
        sam: User,
        alex: User,
        priya: User,
        general: Conversation,
    ) -> None:
        for user in (sam, alex, priya):
            subscribe(user, endpoint(user.username), P256DH, AUTH)

        message = post(general, "Release at four", by=sam)
        deliver(message.pk)

        assert sorted(address for address, _ in sent) == [
            endpoint("alex"),
            endpoint("priya"),
        ]

    def test_a_direct_conversation_pushes_only_to_its_people(
        self, sent: Sent, sam: User, alex: User, priya: User, release: Space
    ) -> None:
        for user in (alex, priya):
            subscribe(user, endpoint(user.username), P256DH, AUTH)
        direct = start_direct(release, [alex], by=sam)

        deliver(post(direct, "Just us", by=sam).pk)

        assert [address for address, _ in sent] == [endpoint("alex")]

    def test_somebody_who_left_the_space_is_sent_nothing(
        self, sent: Sent, sam: User, alex: User, general: Conversation
    ) -> None:
        subscribe(alex, endpoint("alex"), P256DH, AUTH)
        remove_from_space(general.space, alex, by=sam)

        deliver(post(general, "After you left", by=sam).pk)

        assert sent == []

    def test_a_push_never_carries_the_message_s_text(
        self, sam: User, alex: User, release: Space, general: Conversation
    ) -> None:
        channel = push_for(post(general, "The secret plan", by=sam))
        direct = push_for(
            post(start_direct(release, [alex], by=sam), "Also secret", by=sam)
        )

        assert channel == Push(
            title="general in Release",
            body="Sam Patel sent a message",
            url=f"/conversations/{general.pk}",
            tag=f"conversation-{general.pk}",
        )
        assert direct.title == "Sam Patel"
        assert direct.body == "Sent you a message"
        for push in (channel, direct):
            assert "secret" not in push.payload().lower()
        assert json.loads(channel.payload())["data"] == {
            "url": f"/conversations/{general.pk}"
        }

    def test_a_subscription_that_has_gone_is_deleted(
        self,
        monkeypatch: pytest.MonkeyPatch,
        sam: User,
        alex: User,
        priya: User,
        general: Conversation,
    ) -> None:
        subscribe(alex, endpoint("gone"), P256DH, AUTH)
        subscribe(priya, endpoint("still-here"), P256DH, AUTH)
        monkeypatch.setattr(
            services,
            "sender",
            lambda s, push, key: s.endpoint != endpoint("gone"),
        )

        deliver(post(general, "Hello", by=sam).pk)

        assert [s.endpoint for s in PushSubscription.objects.all()] == [
            endpoint("still-here")
        ]

    def test_with_push_off_nothing_is_sent(
        self,
        settings: DjangoSettings,
        sent: Sent,
        sam: User,
        alex: User,
        general: Conversation,
    ) -> None:
        settings.PUSH_KEYS = None
        subscribe(alex, endpoint("alex"), P256DH, AUTH)

        deliver(post(general, "Hello", by=sam).pk)

        assert sent == []


class TestAfterPosting:
    @pytest.fixture(autouse=True)
    def push_on(self, settings: DjangoSettings) -> None:
        settings.PUSH_KEYS = KEYS

    def test_a_push_starts_once_the_message_is_committed(
        self,
        monkeypatch: pytest.MonkeyPatch,
        django_capture_on_commit_callbacks: Callable[..., object],
        sam: User,
        general: Conversation,
    ) -> None:
        started: list[int] = []
        monkeypatch.setattr(services, "start", started.append)

        with django_capture_on_commit_callbacks(execute=True):  # type: ignore[attr-defined]
            message = post(general, "Hello", by=sam)

        assert started == [message.pk]

    def test_with_push_off_nothing_starts(
        self,
        settings: DjangoSettings,
        monkeypatch: pytest.MonkeyPatch,
        django_capture_on_commit_callbacks: Callable[..., object],
        sam: User,
        general: Conversation,
    ) -> None:
        settings.PUSH_KEYS = None
        started: list[int] = []
        monkeypatch.setattr(services, "start", started.append)

        with django_capture_on_commit_callbacks(execute=True):  # type: ignore[attr-defined]
            post(general, "Hello", by=sam)

        assert started == []

    def test_delivery_runs_in_a_thread_of_its_own(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        ran: list[tuple[int, str]] = []
        done = threading.Event()

        def stand_in(message_id: int) -> None:
            ran.append((message_id, threading.current_thread().name))
            done.set()

        monkeypatch.setattr(services, "deliver", stand_in)
        monkeypatch.setattr(connection, "close", lambda: None)

        services.start_in_background(7)

        assert done.wait(5)
        assert ran == [(7, "push-7")]


class TestSending:
    def subscription(self) -> PushSubscription:
        return PushSubscription(
            endpoint=endpoint("x"), p256dh=P256DH, auth=AUTH
        )

    def push(self) -> Push:
        return Push(
            title="t", body="b", url="/conversations/1", tag="conversation-1"
        )

    def test_it_signs_and_sends_with_the_contact(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        calls: list[dict[str, object]] = []
        monkeypatch.setattr(
            services, "webpush", lambda **kwargs: calls.append(kwargs)
        )

        assert services.send_one(self.subscription(), self.push(), KEYS)
        (call,) = calls
        assert call["vapid_private_key"] == KEYS.private
        assert call["vapid_claims"] == {"sub": KEYS.contact}
        assert call["headers"] == {
            "Urgency": "normal",
            "Topic": "conversation-1",
        }
        assert call["data"] == self.push().payload()

    @pytest.mark.parametrize(
        ("status", "kept"), [(410, False), (404, False), (500, True)]
    )
    def test_only_a_gone_subscription_is_reported_gone(
        self, monkeypatch: pytest.MonkeyPatch, status: int, kept: bool
    ) -> None:
        def refuse(**kwargs: object) -> None:
            raise WebPushException(
                "refused", response=SimpleNamespace(status_code=status)
            )

        monkeypatch.setattr(services, "webpush", refuse)

        assert (
            services.send_one(self.subscription(), self.push(), KEYS) is kept
        )


class TestKeys:
    def test_a_key_pair_has_the_shape_browsers_need(self) -> None:
        public, private = key_pair()

        def raw(text: str) -> bytes:
            return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))

        assert len(raw(public)) == 65
        assert raw(public)[0] == 0x04
        assert len(raw(private)) == 32
        assert "=" not in public + private

    @pytest.mark.parametrize(
        "contact", ["mailto:team@juttu.example", "https://juttu.example"]
    )
    def test_pywebpush_signs_with_a_new_key_and_the_contact(
        self, contact: str
    ) -> None:
        """What pywebpush does before each push, short of sending it."""
        _, private = key_pair()

        headers = Vapid.from_string(private).sign(
            {"sub": contact, "aud": "https://fcm.googleapis.com"}
        )

        assert headers["Authorization"].startswith("vapid t=")

    def test_the_command_prints_them_as_settings(self) -> None:
        out = StringIO()

        call_command(
            "generate_push_keys", "--prefix", "JUTTU_BOX_VAPID_", stdout=out
        )
        lines = out.getvalue().splitlines()

        assert [line.split("=", 1)[0] for line in lines] == [
            "JUTTU_BOX_VAPID_PUBLIC_KEY",
            "JUTTU_BOX_VAPID_PRIVATE_KEY",
        ]


class TestLooking:
    @pytest.fixture(autouse=True)
    def push_on(
        self, settings: DjangoSettings, alex: User, priya: User
    ) -> None:
        """Push on, and alex and priya told of every message, as Phase 19
        sent them before quiet became the default in Phase 20."""
        settings.PUSH_KEYS = KEYS
        for user in (alex, priya):
            NotificationSetting.objects.create(
                user=user, level=NotifyLevel.EVERYTHING
            )

    def say(self, user: User, conversation: int, looking: bool) -> int:
        response = signed_in(user).post(
            "/api/push/looking",
            {"conversation": conversation, "looking": looking},
            content_type="application/json",
        )

        return response.status_code

    def test_nobody_looking_at_the_conversation_is_sent_a_push(
        self,
        sent: Sent,
        sam: User,
        alex: User,
        priya: User,
        general: Conversation,
    ) -> None:
        for user in (alex, priya):
            subscribe(user, endpoint(user.username), P256DH, AUTH)

        assert self.say(alex, general.pk, True) == 204
        deliver(post(general, "Hello", by=sam).pk)

        assert [address for address, _ in sent] == [endpoint("priya")]

    def test_putting_it_away_means_pushes_again(
        self, sent: Sent, sam: User, alex: User, general: Conversation
    ) -> None:
        subscribe(alex, endpoint("alex"), P256DH, AUTH)
        self.say(alex, general.pk, True)

        assert self.say(alex, general.pk, False) == 204
        deliver(post(general, "Hello", by=sam).pk)

        assert [address for address, _ in sent] == [endpoint("alex")]

    def test_the_mark_lapses_after_a_minute(
        self, sent: Sent, sam: User, alex: User, general: Conversation
    ) -> None:
        subscribe(alex, endpoint("alex"), P256DH, AUTH)
        self.say(alex, general.pk, True)
        Looking.objects.update(until=timezone.now() - timedelta(seconds=1))

        deliver(post(general, "Hello", by=sam).pk)

        assert [address for address, _ in sent] == [endpoint("alex")]

    def test_looking_elsewhere_still_pushes(
        self,
        sent: Sent,
        sam: User,
        alex: User,
        release: Space,
        general: Conversation,
    ) -> None:
        subscribe(alex, endpoint("alex"), P256DH, AUTH)
        other = start_channel(release, "random", by=sam)
        self.say(alex, other.pk, True)

        deliver(post(general, "Hello", by=sam).pk)

        assert [address for address, _ in sent] == [endpoint("alex")]

    def test_the_mark_is_renewed_not_repeated(
        self, alex: User, general: Conversation
    ) -> None:
        self.say(alex, general.pk, True)
        self.say(alex, general.pk, True)

        mark = Looking.objects.get()
        assert mark.until > timezone.now() + timedelta(seconds=50)

    def test_a_conversation_the_person_cannot_read_answers_not_found(
        self, sam: User, release: Space, priya: User, alex: User
    ) -> None:
        direct = start_direct(release, [alex], by=sam)

        assert self.say(priya, direct.pk, True) == 404
        assert Looking.objects.count() == 0

    def test_somebody_signed_out_cannot_say_so(
        self, client: Client, general: Conversation
    ) -> None:
        response = client.post(
            "/api/push/looking",
            {"conversation": general.pk, "looking": True},
            content_type="application/json",
        )

        assert response.status_code == 403


class TestQuietByDefault:
    @pytest.fixture(autouse=True)
    def push_on(self, settings: DjangoSettings) -> None:
        settings.PUSH_KEYS = KEYS

    @pytest.fixture(autouse=True)
    def subscribed(self, alex: User, priya: User) -> None:
        for user in (alex, priya):
            subscribe(user, endpoint(user.username), P256DH, AUTH)

    def pushed(self, sent: Sent) -> list[str]:
        return sorted(address for address, _ in sent)

    def test_a_channel_message_waits_to_be_read(
        self, sent: Sent, sam: User, general: Conversation
    ) -> None:
        deliver(post(general, "Release at four", by=sam).pk)

        assert sent == []

    def test_a_direct_message_notifies(
        self, sent: Sent, sam: User, alex: User, release: Space
    ) -> None:
        direct = start_direct(release, [alex], by=sam)

        deliver(post(direct, "Got a minute?", by=sam).pk)

        assert self.pushed(sent) == [endpoint("alex")]

    @pytest.mark.parametrize(
        "body",
        ["@alex can you check?", "Thanks, @ALEX.", "(@alex) and others"],
    )
    def test_a_mention_notifies_only_who_is_mentioned(
        self, sent: Sent, sam: User, general: Conversation, body: str
    ) -> None:
        deliver(post(general, body, by=sam).pk)

        assert self.pushed(sent) == [endpoint("alex")]

    def test_an_address_is_not_a_mention(
        self, sent: Sent, sam: User, general: Conversation
    ) -> None:
        deliver(post(general, "Write to team@alex today", by=sam).pk)

        assert sent == []

    def test_mentioning_somebody_outside_the_space_notifies_nobody(
        self, sent: Sent, sam: User, general: Conversation
    ) -> None:
        outsider = person("olu")
        subscribe(outsider, endpoint("olu"), P256DH, AUTH)

        deliver(post(general, "@olu have a look", by=sam).pk)

        assert sent == []

    def test_somebody_who_chose_everything_hears_every_message(
        self, sent: Sent, sam: User, priya: User, general: Conversation
    ) -> None:
        signed_in(priya).post(
            "/api/push/settings",
            {"level": "everything"},
            content_type="application/json",
        )

        deliver(post(general, "Release at four", by=sam).pk)

        assert self.pushed(sent) == [endpoint("priya")]

    def test_somebody_who_chose_nothing_hears_nothing(
        self, sent: Sent, sam: User, alex: User, release: Space
    ) -> None:
        signed_in(alex).post(
            "/api/push/settings",
            {"level": "nothing"},
            content_type="application/json",
        )
        direct = start_direct(release, [alex], by=sam)

        deliver(post(direct, "@alex urgent", by=sam).pk)

        assert sent == []


class TestSettings:
    def test_a_person_is_quiet_until_they_choose(self, alex: User) -> None:
        response = signed_in(alex).get("/api/push/settings")

        assert response.json() == {"level": "quiet"}

    def test_a_choice_is_kept_and_audited(self, alex: User) -> None:
        client = signed_in(alex)

        response = client.post(
            "/api/push/settings",
            {"level": "everything"},
            content_type="application/json",
        )

        assert response.status_code == 200
        assert client.get("/api/push/settings").json() == {
            "level": "everything"
        }
        event = AuditEvent.objects.get(
            action=AuditAction.NOTIFICATION_SETTING_CHANGED
        )
        assert (event.actor, event.detail) == (alex, {"level": "everything"})

    def test_choosing_the_same_again_writes_nothing(self, alex: User) -> None:
        for _ in range(2):
            signed_in(alex).post(
                "/api/push/settings",
                {"level": "quiet"},
                content_type="application/json",
            )

        assert not AuditEvent.objects.filter(
            action=AuditAction.NOTIFICATION_SETTING_CHANGED
        ).exists()

    def test_an_unknown_choice_is_refused(self, alex: User) -> None:
        response = signed_in(alex).post(
            "/api/push/settings",
            {"level": "loud"},
            content_type="application/json",
        )

        assert response.status_code == 400

    def test_somebody_signed_out_has_no_settings(self, client: Client) -> None:
        assert client.get("/api/push/settings").status_code == 403


class TestMentionParsing:
    @pytest.mark.parametrize(
        ("body", "names"),
        [
            ("@sam and @Alex", {"sam", "alex"}),
            ("ask @first.last, please", {"first.last"}),
            ("@sam.", {"sam"}),
            ("mail me at sam@example.com", set()),
            ("@", set()),
            ("@@sam", set()),
        ],
    )
    def test_usernames_are_read_from_the_text(
        self, body: str, names: set[str]
    ) -> None:
        assert mentioned_usernames(body) == names
