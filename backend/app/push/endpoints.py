"""Whether an address is a push service's. Ported from Quill Medical.

The endpoint is an address the browser was given by its push service, and
the server later sends each notification to it. So it is checked on the way
in: nothing is stored that the sender would then call without question,
which would let a caller make this server send requests of their choosing.
"""

import re
from urllib.parse import urlsplit

#: The push services browsers use. Chrome, Edge on Android, Opera, Brave
#: and Samsung Internet all go through Google's; Firefox through Mozilla's.
#: An exact host, since each service has only the one.
PUSH_HOSTS: frozenset[str] = frozenset(
    {
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
    }
)

#: Services that hand out one of many hosts under a domain of their own:
#: Safari under Apple's, Edge on Windows under Microsoft's. The leading dot
#: matters: it is what stops `web.push.apple.com.example` matching.
PUSH_HOST_SUFFIXES: tuple[str, ...] = (
    ".push.apple.com",
    ".notify.windows.com",
)

#: A host name and nothing else: letters, digits and hyphens in parts joined
#: by dots. Anything outside this is refused before the name is compared
#: with the lists above, because this check and the client that later sends
#: the notification must agree on where the host ends, and they parse an
#: address differently. A backslash is the known case:
#: `https://example.com\.push.apple.com/` reads here as one host ending in
#: Apple's domain, and to the sender as `example.com`.
_HOST_NAME = re.compile(r"[a-z0-9-]+(\.[a-z0-9-]+)+")

#: What an address may be written with: the characters RFC 3986 allows,
#: less the backslash it never did. No spaces, no control characters,
#: nothing outside ASCII.
_ADDRESS = re.compile(r"[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+")


def is_push_host(host: str) -> bool:
    """Whether a host belongs to a push service a browser would use."""
    host = host.lower()

    if not _HOST_NAME.fullmatch(host):
        return False

    return host in PUSH_HOSTS or host.endswith(PUSH_HOST_SUFFIXES)


def is_push_endpoint(address: str) -> bool:
    """Whether *address* is a plain HTTPS address at a push service."""
    if not _ADDRESS.fullmatch(address):
        return False

    parts = urlsplit(address)

    try:
        port = parts.port
    except ValueError:
        return False

    return (
        parts.scheme == "https"
        and is_push_host(parts.hostname or "")
        and port in (None, 443)
        and parts.username is None
        and parts.password is None
    )
