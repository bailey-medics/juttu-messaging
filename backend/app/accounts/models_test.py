"""The account model."""

import pytest
from django.db import IntegrityError

from app.accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


def test_the_password_is_stored_as_argon2() -> None:
    user = User.objects.create_user("sam", PASSWORD)

    assert user.password.startswith("argon2$argon2id$")
    assert user.check_password(PASSWORD)


def test_a_username_is_unique_in_any_case() -> None:
    User.objects.create_user("sam", PASSWORD)

    with pytest.raises(IntegrityError):
        User.objects.create_user("SAM", PASSWORD)


def test_an_account_is_found_by_its_username_in_any_case() -> None:
    sam = User.objects.create_user("sam", PASSWORD)

    assert User.objects.get_by_natural_key("Sam") == sam


@pytest.mark.parametrize(
    ("username", "password"), [("", PASSWORD), ("sam", "")]
)
def test_an_account_needs_a_username_and_a_password(
    username: str, password: str
) -> None:
    with pytest.raises(ValueError):
        User.objects.create_user(username, password)


def test_a_new_account_is_active() -> None:
    assert User.objects.create_user("sam", PASSWORD).is_active is True
