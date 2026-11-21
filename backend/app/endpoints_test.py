"""Every endpoint makes an explicit authorisation decision.

Django REST framework's default is "signed in only", so a view nobody
thought about is already closed. This goes further: each view must state
its ``permission_classes`` itself, even when it repeats the default, so
whoever adds an endpoint has had to decide who may call it. A new route
that does not fails here.
"""

from collections.abc import Iterator

from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.views import APIView


def every_route(
    patterns: list[URLPattern | URLResolver], prefix: str = ""
) -> Iterator[tuple[str, URLPattern]]:
    for pattern in patterns:
        route = prefix + str(pattern.pattern)
        if isinstance(pattern, URLResolver):
            yield from every_route(pattern.url_patterns, route)
        else:
            yield route, pattern


def test_every_route_is_a_view_that_states_who_may_call_it() -> None:
    undecided: list[str] = []

    for route, pattern in every_route(get_resolver().url_patterns):
        view = getattr(pattern.callback, "cls", None)
        is_api_view = isinstance(view, type) and issubclass(view, APIView)
        if not is_api_view or "permission_classes" not in vars(view):
            undecided.append(route)

    assert undecided == []


def test_the_routes_are_found() -> None:
    """The test above checks something: the known routes are there."""
    routes = {route for route, _ in every_route(get_resolver().url_patterns)}

    assert {"api/health", "api/auth/me", "api/auth/sign-in"} <= routes
