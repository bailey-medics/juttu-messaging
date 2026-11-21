"""Structured logging: readable lines in development, JSON elsewhere.

Ported from Quill Medical. A JSON line is what a log collector can filter
on, by severity or by request id. A developer reads the other. Django
applies the result as its ``LOGGING`` setting.
"""

from typing import Any

#: Libraries that write a line for every request, which the request
#: middleware already does once.
NOISY_LOGGERS = ("django.server", "gunicorn.access")


def logging_settings(*, dev_mode: bool, level: str) -> dict[str, Any]:
    """Django's ``LOGGING`` setting: one handler, on the root logger.

    Args:
        dev_mode: Readable lines when true, JSON when false.
        level: The lowest level the root logger writes.

    Returns:
        A ``logging.config.dictConfig`` dictionary.
    """
    readable: dict[str, Any] = {
        "format": "%(asctime)s %(levelname)-8s %(name)s "
        "[%(request_id)s] - %(message)s",
        "datefmt": "%H:%M:%S",
    }
    json_lines: dict[str, Any] = {
        "()": "pythonjsonlogger.json.JsonFormatter",
        "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        "rename_fields": {"asctime": "timestamp", "levelname": "severity"},
        "datefmt": "%Y-%m-%dT%H:%M:%S",
    }

    return {
        "version": 1,
        # Django's own loggers keep running, but write through this handler.
        "disable_existing_loggers": False,
        "formatters": {"juttu": readable if dev_mode else json_lines},
        "filters": {"request": {"()": "app.log_context.RequestContextFilter"}},
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "juttu",
                "filters": ["request"],
            }
        },
        "root": {"handlers": ["stdout"], "level": level},
        "loggers": {
            name: {"level": "WARNING", "propagate": True}
            for name in NOISY_LOGGERS
        },
    }
