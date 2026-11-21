"""Django's settings, as config/settings.py builds them."""

from django.conf import settings


def test_an_unknown_view_is_closed_unless_it_says_otherwise() -> None:
    rest = settings.REST_FRAMEWORK

    assert rest["DEFAULT_PERMISSION_CLASSES"] == [
        "rest_framework.permissions.IsAuthenticated"
    ]


def test_the_api_answers_in_json_only() -> None:
    assert settings.REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] == [
        "rest_framework.renderers.JSONRenderer"
    ]


def test_the_admin_is_not_installed() -> None:
    """It would put a sign-in page at /admin/ before Juttu has accounts."""
    assert "django.contrib.admin" not in settings.INSTALLED_APPS


def test_debug_is_off_outside_development() -> None:
    """The tests run as `testing`, so Django's debug pages are off."""
    assert settings.DEBUG is False
