"""Reading the settings from the environment."""

import pytest
from pydantic import ValidationError

from app.config import (
    DEFAULT_ALLOWED_HOSTS,
    DEVELOPMENT_SECRET_KEY,
    PushKeys,
    Settings,
)

PRODUCTION = {
    "BACKEND_ENV": "production",
    "JUTTU_SECRET_KEY": "a-production-secret",
    "JUTTU_ALLOWED_HOSTS": "juttu.example",
    "DB_PASSWORD": "a-production-password",
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


def test_the_database_is_postgres_built_from_its_parts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(
        monkeypatch,
        {
            "DB_HOST": "db.internal",
            "DB_PORT": "6543",
            "DB_NAME": "juttu_box",
            "DB_USER": "juttu",
            "DB_PASSWORD": "p@ss/word:1",
        },
    )

    database = Settings().database

    assert database["ENGINE"] == "django.db.backends.postgresql"
    assert database["HOST"] == "db.internal"
    assert database["PORT"] == 6543
    assert database["NAME"] == "juttu_box"
    assert database["USER"] == "juttu"
    assert database["PASSWORD"] == "p@ss/word:1"


def test_each_request_is_one_transaction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = Settings().database

    assert database["ATOMIC_REQUESTS"] is True
    assert database["CONN_HEALTH_CHECKS"] is True


def test_production_needs_a_database_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(monkeypatch, PRODUCTION)
    monkeypatch.delenv("DB_PASSWORD")

    with pytest.raises(ValidationError, match="DB_PASSWORD is required"):
        Settings()


def test_the_database_password_is_hidden_when_printed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DB_PASSWORD", "do-not-print-me")

    assert "do-not-print-me" not in repr(Settings())


def test_no_extra_origin_is_trusted_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("JUTTU_CSRF_TRUSTED_ORIGINS", raising=False)

    assert Settings().csrf_trusted_origins == []


def test_the_trusted_origins_are_read_as_a_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "JUTTU_CSRF_TRUSTED_ORIGINS",
        " https://juttu.example:8290 , , http://localhost:8180",
    )

    assert Settings().csrf_trusted_origins == [
        "https://juttu.example:8290",
        "http://localhost:8180",
    ]


def test_a_trusted_origin_needs_its_scheme(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Django cannot match an origin written without https://."""
    monkeypatch.setenv("JUTTU_CSRF_TRUSTED_ORIGINS", "juttu.example:8290")

    with pytest.raises(ValidationError, match="starts with https://"):
        Settings()


def test_push_is_off_without_its_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("PUBLIC_KEY", "PRIVATE_KEY", "CONTACT"):
        monkeypatch.delenv(f"JUTTU_VAPID_{name}", raising=False)

    assert Settings().push_keys is None


@pytest.mark.parametrize(
    "contact", ["mailto:team@juttu.example", "https://juttu.example"]
)
def test_push_keys_are_read_with_their_contact(
    monkeypatch: pytest.MonkeyPatch, contact: str
) -> None:
    _set(
        monkeypatch,
        {
            "JUTTU_VAPID_PUBLIC_KEY": "BPub-lic_1",
            "JUTTU_VAPID_PRIVATE_KEY": "priv_2",
            "JUTTU_VAPID_CONTACT": contact,
        },
    )

    assert Settings().push_keys == PushKeys(
        public="BPub-lic_1", private="priv_2", contact=contact
    )


@pytest.mark.parametrize(
    "values",
    [
        {"JUTTU_VAPID_PUBLIC_KEY": "only-the-public-half"},
        {"JUTTU_VAPID_PRIVATE_KEY": "only-the-private-half"},
        {
            "JUTTU_VAPID_PUBLIC_KEY": "a",
            "JUTTU_VAPID_PRIVATE_KEY": "not base64!",
            "JUTTU_VAPID_CONTACT": "https://juttu.example",
        },
        {"JUTTU_VAPID_PUBLIC_KEY": "a", "JUTTU_VAPID_PRIVATE_KEY": "b"},
        {
            "JUTTU_VAPID_PUBLIC_KEY": "a",
            "JUTTU_VAPID_PRIVATE_KEY": "b",
            # py_vapid refuses an https:// contact with a path.
            "JUTTU_VAPID_CONTACT": "https://juttu.example/team",
        },
        {
            "JUTTU_VAPID_PUBLIC_KEY": "a",
            "JUTTU_VAPID_PRIVATE_KEY": "b",
            "JUTTU_VAPID_CONTACT": "team@juttu.example",
        },
    ],
)
def test_half_a_key_pair_a_bad_key_or_no_contact_is_refused(
    monkeypatch: pytest.MonkeyPatch, values: dict[str, str]
) -> None:
    for name in ("PUBLIC_KEY", "PRIVATE_KEY", "CONTACT"):
        monkeypatch.delenv(f"JUTTU_VAPID_{name}", raising=False)
    _set(monkeypatch, values)

    with pytest.raises(ValidationError, match="JUTTU_VAPID"):
        Settings()


def test_the_private_push_key_is_hidden_when_printed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set(
        monkeypatch,
        {
            "JUTTU_VAPID_PUBLIC_KEY": "public",
            "JUTTU_VAPID_PRIVATE_KEY": "private-value",
            "JUTTU_VAPID_CONTACT": "https://juttu.example",
        },
    )
    found = Settings()

    assert "private-value" not in repr(found)
    assert "private-value" not in repr(found.push_keys)
