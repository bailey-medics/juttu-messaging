"""Request-scoped logging context, through a context variable.

Ported from Quill Medical. ``app.middleware.RequestIdMiddleware`` sets
``request_id_var`` at the start of each request, and the filter here copies
it onto every log record written while that request is handled.
"""

import logging
from contextvars import ContextVar

#: The id of the request being handled, or None outside a request.
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


#: What a line written outside any request shows in place of an id.
NO_REQUEST = "-"


class RequestContextFilter(logging.Filter):
    """Put the current request's id on every log record, or a dash."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or NO_REQUEST

        return True
