"""Reading the settings from the environment."""

import pytest
from pydantic import ValidationError

from app.config import DEFAULT_ALLOWED_HOSTS, DEVELOPMENT_SECRET_KEY, Settings

PRODUCTION = {
    "BACKEND_ENV": "production",
    "JUTTU_SECRET_KEY": "a-production-secret",
    "JUTTU_ALLOWED_HOSTS": "juttu.example",
}


def _set(monkeypatch: pytest.MonkeyPatch, values: dict[str, str]) -> None:
    for name, value in values.items():
        monkeypatch.setenv(name, value)


def test_the_defaults_suit_a_developer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in (
        "BACKEND_ENV",
        "LOG_LEVEL",
        "JUTTU_SECRET_KEY",
        "JUTTU_ALLOWED_HOSTS",
    ):
        monkeypatch.delenv(name, raising=False)

    settings = Settings()

    assert settings.BACKEND_ENV == "development"
    assert settings.secret_key == DEVELOPMENT_SECRET_KEY
    assert settings.allowed_hosts == DEFAULT_ALLOWED_HOSTS
    assert settings.LOG_LEVEL == "INFO"
    assert settings.dev_mode is True


def test_the_environment_sets_each_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(monkeypatch, PRODUCTION)
    monkeypatch.setenv("LOG_LEVEL", "WARNING")

    settings = Settings()

    assert settings.BACKEND_ENV == "production"
    assert settings.LOG_LEVEL == "WARNING"
    assert settings.dev_mode is False


def test_names_are_read_whatever_their_case(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("BACKEND_ENV", raising=False)
    monkeypatch.setenv("backend_env", "testing")

    assert Settings().BACKEND_ENV == "testing"


def test_an_unknown_environment_is_refused(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BACKEND_ENV", "staging")

    with pytest.raises(ValidationError):
        Settings()


def test_a_refused_value_is_left_out_of_the_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Once secrets are settings, the error must not print one."""
    monkeypatch.setenv("BACKEND_ENV", "a-value-that-could-be-secret")

    with pytest.raises(ValidationError) as caught:
        Settings()

    assert "a-value-that-could-be-secret" not in str(caught.value)


def test_production_needs_its_own_secret_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(monkeypatch, PRODUCTION)
    monkeypatch.delenv("JUTTU_SECRET_KEY")

    with pytest.raises(ValidationError, match="JUTTU_SECRET_KEY is required"):
        Settings()


def test_production_needs_its_allowed_hosts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(monkeypatch, PRODUCTION)
    monkeypatch.setenv("JUTTU_ALLOWED_HOSTS", " , ")

    with pytest.raises(
        ValidationError, match="JUTTU_ALLOWED_HOSTS is required"
    ):
        Settings()


def test_production_uses_the_given_key_and_hosts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(monkeypatch, PRODUCTION)
    monkeypatch.setenv("JUTTU_ALLOWED_HOSTS", "juttu.example, localhost")

    settings = Settings()

    assert settings.secret_key == "a-production-secret"
    assert settings.allowed_hosts == ["juttu.example", "localhost"]


def test_the_secret_key_is_hidden_when_printed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("JUTTU_SECRET_KEY", "do-not-print-me")

    assert "do-not-print-me" not in repr(Settings())
