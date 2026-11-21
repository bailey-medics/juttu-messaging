"""The client's address, by the same rule as the sign-in rate limit."""

import pytest
from django.test import RequestFactory
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle

from app.client_address import client_address


@pytest.mark.parametrize(
    "forwarded",
    [None, "10.0.0.1", "192.0.2.9, 10.0.0.1", " 192.0.2.9 ,10.0.0.2 "],
)
def test_it_names_the_address_the_rate_limit_does(
    forwarded: str | None,
) -> None:
    request = RequestFactory().get("/", REMOTE_ADDR="127.0.0.9")
    if forwarded is not None:
        request.META["HTTP_X_FORWARDED_FOR"] = forwarded

    expected = BaseThrottle().get_ident(Request(request))

    assert client_address(request) == expected


def test_it_ignores_the_entry_the_client_wrote() -> None:
    request = RequestFactory().get(
        "/", HTTP_X_FORWARDED_FOR="203.0.113.66, 10.0.0.1"
    )

    assert client_address(request) == "10.0.0.1"
