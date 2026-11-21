"""The health check."""

from django.test import Client


def test_the_health_check_says_the_backend_is_up(client: Client) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_the_health_check_needs_no_sign_in(client: Client) -> None:
    """It is public on purpose: Docker's health check calls it."""
    response = client.get("/api/health")

    assert response.status_code == 200


def test_the_health_check_answers_get_only(client: Client) -> None:
    response = client.post("/api/health", {}, content_type="application/json")

    assert response.status_code == 405


def test_the_health_check_answers_in_json_only(client: Client) -> None:
    """The browsable API is off, so a browser gets JSON too."""
    response = client.get("/api/health", HTTP_ACCEPT="text/html")

    assert response["Content-Type"] == "application/json"
