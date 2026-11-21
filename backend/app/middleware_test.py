"""The request id middleware."""

import logging

import pytest
from django.test import Client

from app.middleware import MAX_REQUEST_ID_LENGTH


def test_every_response_carries_a_request_id(client: Client) -> None:
    response = client.get("/api/health")

    assert len(response["X-Request-ID"]) == 12


def test_a_callers_request_id_is_kept(client: Client) -> None:
    response = client.get("/api/health", HTTP_X_REQUEST_ID="trace-1")

    assert response["X-Request-ID"] == "trace-1"


def test_an_overlong_request_id_is_replaced(client: Client) -> None:
    given = "x" * (MAX_REQUEST_ID_LENGTH + 1)

    response = client.get("/api/health", HTTP_X_REQUEST_ID=given)

    assert response["X-Request-ID"] != given


def test_an_unprintable_request_id_is_replaced(client: Client) -> None:
    response = client.get("/api/health", HTTP_X_REQUEST_ID="bad\x07id")

    assert response["X-Request-ID"] != "bad\x07id"


def test_each_request_is_logged_once_with_its_id(
    client: Client, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app.middleware"):
        client.get("/api/health", HTTP_X_REQUEST_ID="trace-2")

    [record] = [r for r in caplog.records if r.name == "app.middleware"]
    assert record.getMessage().startswith("GET /api/health 200 ")


def test_an_unknown_path_is_not_found(client: Client) -> None:
    response = client.get("/api/nothing-here")

    assert response.status_code == 404
