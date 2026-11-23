"""The answer to a request that fails the CSRF check."""

from django.test import RequestFactory

from app.csrf import csrf_failure


def test_a_csrf_refusal_answers_in_json() -> None:
    request = RequestFactory().post("/api/auth/sign-in")

    response = csrf_failure(request, reason="CSRF cookie not set.")

    assert response.status_code == 403
    assert response["Content-Type"] == "application/json"
    assert b"X-CSRFToken" in response.content
