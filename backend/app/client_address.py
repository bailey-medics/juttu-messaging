"""The address a request came from, as far as it can be trusted.

Caddy is the one proxy in front of the backend, and it writes
``X-Forwarded-For`` itself, so the client's address is that header's last
entry. The first entry is whatever the client wrote. This is the rule
Django REST framework's ``get_ident`` follows with ``NUM_PROXIES`` set to
one, which the sign-in rate limit uses, so the audit trail and the limit
always name the same address.
"""

from django.http import HttpRequest


def client_address(request: HttpRequest) -> str:
    """The last ``X-Forwarded-For`` entry, or the connection's own address."""
    forwarded = str(request.META.get("HTTP_X_FORWARDED_FOR", ""))
    entries = [
        entry.strip() for entry in forwarded.split(",") if entry.strip()
    ]

    if entries:
        return entries[-1]

    return str(request.META.get("REMOTE_ADDR", ""))
