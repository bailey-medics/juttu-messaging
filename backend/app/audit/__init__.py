"""The audit trail: one append-only table, and one function that writes it.

Every phase that changes data writes an entry through ``record``, and its
tests check for it. Postgres itself refuses to change or delete a row, so
neither a bug nor a careless script can rewrite what happened.
"""
