"""A request id for every request, and one log line for each.

Ported from Quill Medical's request logging middleware in ``app.main``.
"""

import logging
import time
from collections.abc import Callable
from uuid import uuid4

from django.http import HttpRequest, HttpResponseBase

from app.log_context import request_id_var

logger = logging.getLogger(__name__)

#: The longest request id taken from a caller. A longer one is replaced, so
#: a caller cannot fill the logs through the header.
MAX_REQUEST_ID_LENGTH = 64


def request_id_for(request: HttpRequest) -> str:
    """The caller's ``X-Request-ID`` if it is usable, or a fresh one."""
    given = request.headers.get("X-Request-ID", "")

    if given and len(given) <= MAX_REQUEST_ID_LENGTH and given.isprintable():
        return given

    return uuid4().hex[:12]


class RequestIdMiddleware:
    """Give each request an id, log it once, and send the id back."""

    def __init__(
        self, get_response: Callable[[HttpRequest], HttpResponseBase]
    ) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponseBase:
        request_id = request_id_for(request)
        token = request_id_var.set(request_id)
        start = time.monotonic()

        try:
            response = self.get_response(request)
            elapsed_ms = round((time.monotonic() - start) * 1000, 1)
            response["X-Request-ID"] = request_id
            logger.info(
                "%s %s %s %.1fms",
                request.method,
                request.path,
                response.status_code,
                elapsed_ms,
            )
        finally:
            request_id_var.reset(token)

        return response
