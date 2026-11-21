"""Signing in, signing out, and asking who is signed in."""

from typing import TYPE_CHECKING

import pytest
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import Client

if TYPE_CHECKING:
    # The test client's answer, named only in django-stubs.
    from django.test.client import _MonkeyPatchedWSGIResponse as TestResponse

from app.accounts.models import User
from app.accounts.views import INVALID_SIGN_IN

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


def csrf_client() -> tuple[Client, str]:
    """A client that is held to the CSRF check, and its token.

    Django's test client skips the check unless told not to, which would
    let every test here pass with the protection switched off.
    """
    client = Client(enforce_csrf_checks=True)
    client.get("/api/auth/me")
    token = client.cookies[settings.CSRF_COOKIE_NAME].value

    return client, token


def sign_in(
    client: Client, token: str, username: str, password: str
) -> TestResponse:
    return client.post(
        "/api/auth/sign-in",
        {"username": username, "password": password},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )


@pytest.fixture
def sam() -> User:
    return User.objects.create_user("sam", PASSWORD)


def test_me_says_nobody_is_signed_in(client: Client) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "user": None}


def test_me_sets_the_csrf_cookie_the_app_needs_to_sign_in(
    client: Client,
) -> None:
    response = client.get("/api/auth/me")

    assert settings.CSRF_COOKIE_NAME in response.cookies


def test_me_names_the_person_signed_in(client: Client, sam: User) -> None:
    client.force_login(sam)

    response = client.get("/api/auth/me")

    assert response.json() == {
        "authenticated": True,
        "user": {"id": sam.pk, "username": "sam"},
    }


def test_signing_in_starts_a_session(sam: User) -> None:
    client, token = csrf_client()

    response = sign_in(client, token, "sam", PASSWORD)

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "sam"
    assert client.get("/api/auth/me").json()["authenticated"] is True


def test_the_session_cookie_cannot_be_read_by_the_page(sam: User) -> None:
    client, token = csrf_client()

    sign_in(client, token, "sam", PASSWORD)
    cookie = client.cookies[settings.SESSION_COOKIE_NAME]

    assert cookie["httponly"] is True
    assert cookie["samesite"] == "Lax"


def test_signing_in_gives_the_session_a_new_key(sam: User) -> None:
    """A key planted before signing in is useless after it."""
    client, token = csrf_client()
    client.session.save()
    planted = client.cookies[settings.SESSION_COOKIE_NAME].value

    sign_in(client, token, "sam", PASSWORD)

    assert client.cookies[settings.SESSION_COOKIE_NAME].value != planted


def test_the_username_matches_in_any_case_and_with_spaces(sam: User) -> None:
    client, token = csrf_client()

    response = sign_in(client, token, "  Sam ", PASSWORD)

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("sam", "the wrong password entirely"),
        ("nobody", PASSWORD),
        ("", ""),
    ],
)
def test_every_failed_sign_in_gives_one_answer(
    sam: User, username: str, password: str
) -> None:
    """The answer never says which usernames exist."""
    client, token = csrf_client()

    response = sign_in(client, token, username, password)

    assert response.status_code == 400
    assert response.json() == {"detail": INVALID_SIGN_IN}
    assert client.get("/api/auth/me").json()["authenticated"] is False


def test_a_closed_account_cannot_sign_in(sam: User) -> None:
    sam.is_active = False
    sam.save()
    client, token = csrf_client()

    response = sign_in(client, token, "sam", PASSWORD)

    assert response.status_code == 400
    assert response.json() == {"detail": INVALID_SIGN_IN}


def test_signing_in_without_the_csrf_token_is_refused(sam: User) -> None:
    """Another site cannot sign a browser in to an account it chose."""
    client, _token = csrf_client()

    response = client.post(
        "/api/auth/sign-in",
        {"username": "sam", "password": PASSWORD},
        content_type="application/json",
    )

    assert response.status_code == 403
    assert response["Content-Type"] == "application/json"
    assert client.get("/api/auth/me").json()["authenticated"] is False


def test_signing_out_ends_the_session(sam: User) -> None:
    client, token = csrf_client()
    sign_in(client, token, "sam", PASSWORD)
    token = client.cookies[settings.CSRF_COOKIE_NAME].value

    response = client.post("/api/auth/sign-out", HTTP_X_CSRFTOKEN=token)

    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "user": None}
    assert client.get("/api/auth/me").json()["authenticated"] is False


def test_signing_out_when_signed_out_succeeds_quietly() -> None:
    client, token = csrf_client()

    response = client.post("/api/auth/sign-out", HTTP_X_CSRFTOKEN=token)

    assert response.status_code == 200


def test_signing_out_without_the_csrf_token_is_refused(sam: User) -> None:
    """Another site cannot sign a person out behind their back."""
    client, token = csrf_client()
    sign_in(client, token, "sam", PASSWORD)

    response = client.post("/api/auth/sign-out")

    assert response.status_code == 403
    assert client.get("/api/auth/me").json()["authenticated"] is True


def test_a_sign_in_upgrades_a_hash_made_by_an_older_hasher(
    sam: User,
) -> None:
    User.objects.filter(pk=sam.pk).update(
        password=make_password(PASSWORD, hasher="pbkdf2_sha256")
    )
    client, token = csrf_client()

    sign_in(client, token, "sam", PASSWORD)

    sam.refresh_from_db()
    assert sam.password.startswith("argon2$")
