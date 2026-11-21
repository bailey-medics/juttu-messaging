"""The answer to a request that fails Django's CSRF check."""

from django.http import HttpRequest, JsonResponse


def csrf_failure(request: HttpRequest, reason: str = "") -> JsonResponse:
    """Refuse in JSON, as the rest of the API answers.

    Django's own failure page is HTML, and an app reading the answer as
    JSON would see a parse error instead of the real problem. Ported from
    Turva's ``csrf_failure``. Juttu serves no HTML pages, so every refusal
    is JSON.
    """
    return JsonResponse(
        {
            "detail": "CSRF check failed. Send the X-CSRFToken header.",
            "reason": reason,
        },
        status=403,
    )
