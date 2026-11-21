"""Logging: readable in development, JSON elsewhere, with the request id."""

import io
import json
import logging
import logging.config
from collections.abc import Iterator

import pytest
from pythonjsonlogger.json import JsonFormatter

from app.log_context import RequestContextFilter, request_id_var
from app.logging_config import NOISY_LOGGERS, logging_settings


@pytest.fixture(autouse=True)
def restore_logging() -> Iterator[None]:
    """Put every logger this touches back, so no other test sees a change."""
    root = logging.getLogger()
    handlers, level = list(root.handlers), root.level
    noisy = {name: logging.getLogger(name).level for name in NOISY_LOGGERS}

    yield

    root.handlers[:] = handlers
    root.setLevel(level)
    for name, was in noisy.items():
        logging.getLogger(name).setLevel(was)


def _apply(*, dev_mode: bool, level: str = "INFO") -> logging.Handler:
    logging.config.dictConfig(logging_settings(dev_mode=dev_mode, level=level))
    [handler] = logging.getLogger().handlers

    return handler


def test_development_gets_a_line_a_person_can_read() -> None:
    handler = _apply(dev_mode=True)

    assert handler.formatter is not None
    assert not isinstance(handler.formatter, JsonFormatter)


def test_anywhere_else_gets_json() -> None:
    handler = _apply(dev_mode=False)

    assert isinstance(handler.formatter, JsonFormatter)


@pytest.mark.parametrize("dev_mode", [True, False])
def test_the_root_logger_has_one_handler_at_the_level_asked(
    dev_mode: bool,
) -> None:
    """Two handlers would write every line twice."""
    _apply(dev_mode=dev_mode, level="WARNING")

    assert len(logging.getLogger().handlers) == 1
    assert logging.getLogger().level == logging.WARNING


@pytest.mark.parametrize("dev_mode", [True, False])
def test_every_line_carries_the_request_it_belongs_to(dev_mode: bool) -> None:
    handler = _apply(dev_mode=dev_mode)

    assert any(isinstance(f, RequestContextFilter) for f in handler.filters)


def test_a_json_line_names_its_severity_and_request() -> None:
    handler = _apply(dev_mode=False)
    assert isinstance(handler, logging.StreamHandler)
    stream = io.StringIO()
    handler.setStream(stream)
    token = request_id_var.set("abc123")

    try:
        logging.getLogger("juttu").warning("hello")
    finally:
        request_id_var.reset(token)

    line = json.loads(stream.getvalue())
    assert line["severity"] == "WARNING"
    assert line["message"] == "hello"
    assert line["request_id"] == "abc123"


def test_a_line_outside_a_request_shows_a_dash() -> None:
    handler = _apply(dev_mode=True)
    assert isinstance(handler, logging.StreamHandler)
    stream = io.StringIO()
    handler.setStream(stream)

    logging.getLogger("juttu").warning("hello")

    assert stream.getvalue().rstrip().endswith("[-] - hello")


def test_noisy_loggers_are_quietened() -> None:
    _apply(dev_mode=True)

    for name in NOISY_LOGGERS:
        assert logging.getLogger(name).level == logging.WARNING
