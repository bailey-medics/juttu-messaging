"""The environment, read and checked once.

Ported from Quill Medical's ``app.config``, keeping only what the empty
shell needs. ``config.settings`` turns it into Django's settings. Each
later phase adds its own values here.
"""

from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Where the backend is running. Development gets readable logs and Django's
#: debug pages; anything else gets JSON logs and neither.
Environment = Literal["development", "testing", "production"]

#: The development secret key. Never used in production, which refuses to
#: start without its own, so Bandit's hard-coded password warning does not
#: apply to this one value.
DEVELOPMENT_SECRET_KEY = "development-only-not-a-secret-juttu-key"  # nosec B105

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

    @model_validator(mode="after")
    def _production_has_its_own_values(self) -> Self:
        """Refuse to start in production on a development default."""
        if self.BACKEND_ENV != "production":
            return self

        if not self.JUTTU_SECRET_KEY.get_secret_value():
            raise ValueError("JUTTU_SECRET_KEY is required in production")

        if not self._listed_hosts():
            raise ValueError("JUTTU_ALLOWED_HOSTS is required in production")

        return self

    def _listed_hosts(self) -> list[str]:
        return [
            host.strip()
            for host in self.JUTTU_ALLOWED_HOSTS.split(",")
            if host.strip()
        ]

    @property
    def dev_mode(self) -> bool:
        """Whether the backend is running for a developer."""
        return self.BACKEND_ENV == "development"

    @property
    def secret_key(self) -> str:
        """Django's secret key: the environment's, or the development one."""
        given = self.JUTTU_SECRET_KEY.get_secret_value()

        return given or DEVELOPMENT_SECRET_KEY

    @property
    def allowed_hosts(self) -> list[str]:
        """The hosts Django answers: the listed ones, or this machine's."""
        return self._listed_hosts() or list(DEFAULT_ALLOWED_HOSTS)


settings = Settings()
