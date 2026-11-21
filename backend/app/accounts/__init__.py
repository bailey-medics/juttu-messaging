"""Accounts, signing in and signing out.

Ported from Quill Medical's design, in the Django form Turva gives it:
Django supplies password hashing, sessions and the CSRF check, so what is
left here is the user model, the sign-in rate limit, three endpoints and
the command that makes the first account.
"""
