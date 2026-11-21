set shell := ["bash", "-c"]

# These recipes are thin wrappers over the scripts in s/, which hold the
# one implementation of each repeated job. Use `just` for the short names,
# or call ./s/<script> directly. Both work.

default:
    @just --list


# Switch on the tracked git hook in .githooks, so every commit runs
# pre-commit on the staged files. Once per clone: the setting is shared by
# every worktree.
setup:
    @./s/install-hooks


alias l := lint
# Run every check pre-commit enforces, over the whole repository
lint *args:
    @./s/lint {{args}}


alias t := test
# Run every test suite
test:
    @./s/test


alias ub := unit-tests-backend
# Run the backend tests in a throwaway container mounting this worktree
unit-tests-backend *args:
    @./s/test backend {{args}}


alias m := migrate
# Write a migration for this worktree's model changes (throwaway database)
migrate message:
    @./s/migrate new "{{message}}"
