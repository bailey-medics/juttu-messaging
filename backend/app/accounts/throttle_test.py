"""The rate limit on signing in: five attempts a minute from one address."""

from datetime import timedelta

import pytest
from django.conf import settings
from django.test import Client
from django.utils import timezone

from app.accounts.models import SignInAttempt, User
from app.accounts.throttle import SIGN_IN_LIMIT, SIGN_IN_WINDOW

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


def attempt(client: Client, password: str, **headers: str) -> int:
    response = client.post(
        "/api/auth/sign-in",
        {"username": "sam", "password": password},
        content_type="application/json",
        headers=headers,
    )

    return response.status_code


@pytest.fixture(autouse=True)
def sam() -> User:
    return User.objects.create_user("sam", PASSWORD)


def test_a_sixth_attempt_in_a_minute_is_refused(client: Client) -> None:
    for _ in range(SIGN_IN_LIMIT):
        assert attempt(client, "wrong password, guessed") == 400

    assert attempt(client, PASSWORD) == 429


def test_the_refusal_says_when_to_try_again(client: Client) -> None:
    for _ in range(SIGN_IN_LIMIT):
        attempt(client, "wrong password, guessed")

    response = client.post(
        "/api/auth/sign-in",
        {"username": "sam", "password": PASSWORD},
        content_type="application/json",
    )

    assert response.status_code == 429
    assert 0 < int(response["Retry-After"]) <= 60


def test_failed_attempts_are_counted_and_kept(client: Client) -> None:
    """A failure is counted, though the view refuses it."""
    attempt(client, "wrong password, guessed")

    assert SignInAttempt.objects.count() == 1


def test_attempts_older_than_the_window_no_longer_count(
    client: Client,
) -> None:
    old = timezone.now() - SIGN_IN_WINDOW - timedelta(seconds=1)
    SignInAttempt.objects.bulk_create(
        SignInAttempt(address="127.0.0.1", attempted_at=old)
        for _ in range(SIGN_IN_LIMIT)
    )

    assert attempt(client, PASSWORD) == 200
    assert SignInAttempt.objects.filter(attempted_at=old).count() == 0


def test_another_address_has_its_own_count(client: Client) -> None:
    for _ in range(SIGN_IN_LIMIT):
        attempt(client, "wrong password, guessed", x_forwarded_for="10.0.0.1")

    assert attempt(client, PASSWORD, x_forwarded_for="10.0.0.2") == 200


def test_the_address_is_the_one_caddy_wrote_not_the_client(
    client: Client,
) -> None:
    """A client cannot dodge the limit by writing its own first entry."""
    for n in range(SIGN_IN_LIMIT):
        attempt(
            client,
            "wrong password, guessed",
            x_forwarded_for=f"192.0.2.{n}, 10.0.0.1",
        )

    status = attempt(client, PASSWORD, x_forwarded_for="192.0.2.99, 10.0.0.1")

    assert status == 429


def test_the_proxy_count_matches_the_one_caddy_in_front() -> None:
    assert settings.REST_FRAMEWORK["NUM_PROXIES"] == 1
