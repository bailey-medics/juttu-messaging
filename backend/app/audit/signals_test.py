"""Every sign-in, sign-out and failed sign-in is in the audit trail."""

import pytest
from django.conf import settings
from django.test import Client

from app.accounts.models import User
from app.audit.models import AuditEvent

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


@pytest.fixture
def sam() -> User:
    return User.objects.create_user("sam", PASSWORD)


def sign_in(client: Client, username: str, password: str) -> int:
    response = client.post(
        "/api/auth/sign-in",
        {"username": username, "password": password},
        content_type="application/json",
        headers={"x-forwarded-for": "198.51.100.4"},
    )

    return response.status_code


def actions() -> list[tuple[str, int | None]]:
    return list(
        AuditEvent.objects.order_by("id").values_list("action", "actor_id")
    )


def test_a_sign_in_is_recorded(client: Client, sam: User) -> None:
    sign_in(client, "sam", PASSWORD)

    entry = AuditEvent.objects.get()
    assert (entry.action, entry.actor) == ("sign_in", sam)
    assert entry.address == "198.51.100.4"


def test_a_wrong_password_is_recorded_against_the_account(
    client: Client, sam: User
) -> None:
    assert sign_in(client, "Sam", "the wrong password entirely") == 400

    entry = AuditEvent.objects.get()
    assert (entry.action, entry.actor) == ("sign_in_failed", sam)
    assert entry.detail == {"account_found": True}


def test_an_unknown_username_is_recorded_without_the_text_typed(
    client: Client,
) -> None:
    """A password typed into the username field never reaches the log."""
    sign_in(client, "my-secret-password-typed-here", PASSWORD)

    entry = AuditEvent.objects.get()
    assert (entry.action, entry.actor) == ("sign_in_failed", None)
    assert entry.detail == {"account_found": False}
    assert "my-secret" not in str(AuditEvent.objects.values().get())


def test_a_closed_account_signing_in_is_recorded_as_failed(
    client: Client, sam: User
) -> None:
    sam.is_active = False
    sam.save()

    sign_in(client, "sam", PASSWORD)

    assert actions() == [("sign_in_failed", sam.pk)]


def test_a_sign_out_is_recorded(sam: User) -> None:
    client = Client(enforce_csrf_checks=True)
    client.get("/api/auth/me")
    client.post(
        "/api/auth/sign-in",
        {"username": "sam", "password": PASSWORD},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=client.cookies[settings.CSRF_COOKIE_NAME].value,
    )

    client.post(
        "/api/auth/sign-out",
        HTTP_X_CSRFTOKEN=client.cookies[settings.CSRF_COOKIE_NAME].value,
    )

    assert actions() == [("sign_in", sam.pk), ("sign_out", sam.pk)]


def test_signing_out_when_signed_out_records_nothing(client: Client) -> None:
    client.post("/api/auth/sign-out")

    assert actions() == []
