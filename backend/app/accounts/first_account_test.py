"""The command that makes the first account."""

from collections.abc import Iterator

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from app.accounts.management.commands import create_first_account
from app.accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


def answer(
    monkeypatch: pytest.MonkeyPatch, username: str, *passwords: str
) -> None:
    """Answer the command's questions as a person at the keyboard would."""
    secrets: Iterator[str] = iter(passwords)
    monkeypatch.setattr(create_first_account, "ask", lambda _prompt: username)
    monkeypatch.setattr(
        create_first_account, "ask_secret", lambda _prompt: next(secrets)
    )


def test_it_makes_the_account_it_is_told(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer(monkeypatch, " sam ", PASSWORD, PASSWORD)

    call_command("create_first_account")

    user = User.objects.get()
    assert user.username == "sam"
    assert user.check_password(PASSWORD)


def test_it_refuses_once_an_account_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every later account comes from an invite."""
    User.objects.create_user("alex", PASSWORD)
    answer(monkeypatch, "sam", PASSWORD, PASSWORD)

    with pytest.raises(CommandError, match="already exists"):
        call_command("create_first_account")

    assert User.objects.count() == 1


def test_it_refuses_two_passwords_that_differ(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer(monkeypatch, "sam", PASSWORD, PASSWORD + " typo")

    with pytest.raises(CommandError, match="differ"):
        call_command("create_first_account")

    assert not User.objects.exists()


def test_it_refuses_a_short_password(monkeypatch: pytest.MonkeyPatch) -> None:
    answer(monkeypatch, "sam", "too short", "too short")

    with pytest.raises(CommandError, match="at least 15 characters"):
        call_command("create_first_account")

    assert not User.objects.exists()


def test_it_refuses_a_blank_username(monkeypatch: pytest.MonkeyPatch) -> None:
    answer(monkeypatch, "  ", PASSWORD, PASSWORD)

    with pytest.raises(CommandError):
        call_command("create_first_account")

    assert not User.objects.exists()


def test_nothing_is_seeded() -> None:
    """No account exists until somebody makes one."""
    assert not User.objects.exists()
