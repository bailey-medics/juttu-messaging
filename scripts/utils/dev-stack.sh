#!/usr/bin/env bash
# The one way the scripts in scripts/ reach the development stack.
#
# Usage: source it, then `dev_stack <docker compose arguments>`, such as
#   dev_stack up --detach --wait
#
# Runs Docker Compose on compose.dev.yml, from the repository root, as the
# host user on Linux, so what the backend writes into the worktree stays
# the host user's.

dev_stack() {
	HOST_UID="${HOST_UID:-$(id -u)}" HOST_GID="${HOST_GID:-$(id -g)}" \
		docker compose -f compose.dev.yml "$@"
}
