"""The environment, read and checked once.

Ported from Quill Medical's ``app.config``, keeping only what the empty
shell needs. ``config.settings`` turns it into Django's settings. Each
later phase adds its own values here.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Literal, Self

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Where the backend is running. Development gets readable logs and Django's
#: debug pages; anything else gets JSON logs and neither.
Environment = Literal["development", "testing", "production"]

#: The development secret key. Never used in production, which refuses to
#: start without its own, so Bandit's hard-coded password warning does not
#: apply to this one value.
DEVELOPMENT_SECRET_KEY = "development-only-not-a-secret-juttu-key"  # nosec B105

#: A key written in URL-safe base64, as Web Push keys are, without padding.
_URL_SAFE_BASE64 = re.compile(r"[A-Za-z0-9_-]+")

#: A contact the push services accept: what ``py_vapid`` checks, a mailto:
#: address or an https:// origin with no path.
_PUSH_CONTACT = re.compile(
    r"mailto:[^@\s]+@[\w.-]+\.[\w-]+|https://[\w-]+(\.[\w-]+)+"
)


@dataclass(frozen=True)
class PushKeys:
    """What signs each push: the key pair, and who to contact about it."""

    public: str
    private: str = field(repr=False)
    contact: str


#: The hosts Django answers outside production.
DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1"]


class Settings(BaseSettings):
    """Settings loaded from environment variables.

    Attributes:
        BACKEND_ENV: Where the backend is running.
        LOG_LEVEL: The lowest level the root logger writes.
        JUTTU_SECRET_KEY: Django's secret key. Required in production.
        JUTTU_ALLOWED_HOSTS: The host names Django answers, separated by
            commas. Required in production.
        JUTTU_CSRF_TRUSTED_ORIGINS: The origins a page may post from,
            such as ``https://juttu.example:8290``, separated by commas.
            Needed behind a proxy that ends HTTPS before Caddy, as the
            private network's proxy does on the dev box.
        DB_HOST: The Postgres server's host name.
        DB_PORT: The port Postgres listens on, inside its network.
        DB_NAME: The database Juttu keeps its tables in.
        DB_USER: The database user Juttu signs in as.
        DB_PASSWORD: That user's password. Required in production.
        JUTTU_VAPID_PUBLIC_KEY: The public half of the Web Push signing
            key pair, in URL-safe base64, which phones subscribe with.
        JUTTU_VAPID_PRIVATE_KEY: Its private half. With neither set, push
            notifications are off; one without the other is refused.
        JUTTU_VAPID_CONTACT: Who the push services may contact about
            Juttu's pushes: a ``mailto:`` address or an ``https://``
            origin with no path, as the VAPID standard and Apple ask.
            Required with the keys.
    """

    # No env_file: Docker Compose hands the environment in.
    model_config = SettingsConfigDict(
        extra="ignore",
        case_sensitive=False,
        # A setting that fails validation is reported without what it was
        # given, so a secret never reaches the start-up log.
        hide_input_in_errors=True,
    )

    BACKEND_ENV: Environment = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    JUTTU_SECRET_KEY: SecretStr = SecretStr("")
    JUTTU_ALLOWED_HOSTS: str = ""
    JUTTU_CSRF_TRUSTED_ORIGINS: str = ""

    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "juttu"
    DB_USER: str = "juttu"
    DB_PASSWORD: SecretStr = SecretStr("")

    JUTTU_VAPID_PUBLIC_KEY: str = ""
    JUTTU_VAPID_PRIVATE_KEY: SecretStr = SecretStr("")
    JUTTU_VAPID_CONTACT: str = ""

    @field_validator("JUTTU_CSRF_TRUSTED_ORIGINS")
    @classmethod
    def _origins_name_their_scheme(cls, value: str) -> str:
        """Refuse an origin without its scheme, which Django cannot use."""
        for origin in _listed(value):
            if not origin.startswith(("https://", "http://")):
                raise ValueError(
                    "Each JUTTU_CSRF_TRUSTED_ORIGINS entry starts with "
                    "https:// or http://"
                )

        return value

    @model_validator(mode="after")
    def _push_keys_come_as_a_pair(self) -> Self:
        """Refuse half a signing key pair, and a key that is not base64."""
        public = self.JUTTU_VAPID_PUBLIC_KEY
        private = self.JUTTU_VAPID_PRIVATE_KEY.get_secret_value()

        if bool(public) != bool(private):
            raise ValueError(
                "Set JUTTU_VAPID_PUBLIC_KEY and JUTTU_VAPID_PRIVATE_KEY "
                "together, or neither"
            )

        for key in (public, private):
            if key and not _URL_SAFE_BASE64.fullmatch(key):
                raise ValueError("A JUTTU_VAPID_* key is URL-safe base64")

        if private and not _PUSH_CONTACT.fullmatch(self.JUTTU_VAPID_CONTACT):
            raise ValueError(
                "JUTTU_VAPID_CONTACT is required with the push keys: a "
                "mailto: address, or an https:// origin with no path"
            )

        return self

    @model_validator(mode="after")
    def _production_has_its_own_values(self) -> Self:
        """Refuse to start in production on a development default."""
        if self.BACKEND_ENV != "production":
            return self

        if not self.JUTTU_SECRET_KEY.get_secret_value():
            raise ValueError("JUTTU_SECRET_KEY is required in production")

        if not self._listed_hosts():
            raise ValueError("JUTTU_ALLOWED_HOSTS is required in production")

        if not self.DB_PASSWORD.get_secret_value():
            raise ValueError("DB_PASSWORD is required in production")

        return self

    def _listed_hosts(self) -> list[str]:
        return _listed(self.JUTTU_ALLOWED_HOSTS)

    @property
    def dev_mode(self) -> bool:
        """Whether the backend is running for a developer."""
        return self.BACKEND_ENV == "development"

    @property
    def push_keys(self) -> PushKeys | None:
        """The Web Push signing keys and contact, or None if push is off."""
        private = self.JUTTU_VAPID_PRIVATE_KEY.get_secret_value()
        if not private:
            return None

        return PushKeys(
            public=self.JUTTU_VAPID_PUBLIC_KEY,
            private=private,
            contact=self.JUTTU_VAPID_CONTACT,
        )

    @property
    def secret_key(self) -> str:
        """Django's secret key: the environment's, or the development one."""
        given = self.JUTTU_SECRET_KEY.get_secret_value()

        return given or DEVELOPMENT_SECRET_KEY

    @property
    def allowed_hosts(self) -> list[str]:
        """The hosts Django answers: the listed ones, or this machine's."""
        return self._listed_hosts() or list(DEFAULT_ALLOWED_HOSTS)

    @property
    def csrf_trusted_origins(self) -> list[str]:
        """The origins Django's CSRF check accepts beyond the request's own.

        On the dev box the private network's proxy ends HTTPS and passes
        plain HTTP to Caddy, so Django sees an HTTP request from an HTTPS
        page and refuses it unless that page's origin is listed here.
        """
        return _listed(self.JUTTU_CSRF_TRUSTED_ORIGINS)

    @property
    def database(self) -> dict[str, Any]:
        """Django's ``DATABASES["default"]``: Postgres, through psycopg 3.

        Django passes each value to psycopg on its own, so a password
        holding ``@`` or ``/`` needs no quoting.
        """
        return {
            "ENGINE": "django.db.backends.postgresql",
            "HOST": self.DB_HOST,
            "PORT": self.DB_PORT,
            "NAME": self.DB_NAME,
            "USER": self.DB_USER,
            "PASSWORD": self.DB_PASSWORD.get_secret_value(),
            # A request is one transaction: it commits when the view
            # returns, and rolls back when the view raises.
            "ATOMIC_REQUESTS": True,
            # A connection the server dropped is noticed and replaced
            # before a request uses it.
            "CONN_HEALTH_CHECKS": True,
        }


def _listed(value: str) -> list[str]:
    """The entries of a comma-separated setting, trimmed, blanks left out."""
    return [entry.strip() for entry in value.split(",") if entry.strip()]


settings = Settings()
