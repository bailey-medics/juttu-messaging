#!/usr/bin/env bash
# Run the test suites.
#
# Usage:
#   scripts/test.sh                    every suite
#   scripts/test.sh scripts/tests            the bats tests only
#   scripts/test.sh backend [args]     the backend tests only, with pytest's args
#   scripts/test.sh migrations         the migration check only
#   scripts/test.sh frontend           the frontend's Vitest suite only
#
# The suites:
#
#   scripts/tests/   bats tests for the scripts in scripts/ and the git hook. They run
#              on the host and need bats; nothing they test reaches Docker
#              or GitHub.
#   backend/   pytest, in a throwaway container built from the backend's
#              dev image with this worktree mounted, beside a throwaway
#              Postgres, so it runs from any worktree without the dev
#              stack. See compose.unit-tests.yml.
#   frontend/  Vitest, on the host, through scripts/frontend.sh.
#   migrations scripts/migrate.sh check: the migrations apply, undo and match the
#              models, on a throwaway Postgres. See compose.migrate.yml.
#
# Each later phase of the skeleton plan adds its own suite here.
set -euo pipefail

cd "$(dirname "$0")/.."

run_bats() {
	if ! command -v bats >/dev/null 2>&1; then
		echo "bats not found. Install it with your package manager, such as:" >&2
		echo "  sudo apt install bats" >&2
		exit 1
	fi

	echo "==> bats scripts/tests"
	bats scripts/tests
}

# shellcheck source=utils/project-name.sh
source scripts/utils/project-name.sh

run_backend() {
	if ! command -v docker >/dev/null 2>&1; then
		echo "docker not found. The backend tests run in a container, so Docker is needed." >&2
		exit 1
	fi

	echo "==> pytest backend (in a throwaway container)"

	local project status=0
	project="$(project_name juttu-test)"

	# On Linux the container runs as the host user, so what pytest writes
	# into the worktree stays the host user's. `run` starts the tests'
	# Postgres first and leaves it running, so it is removed afterwards,
	# whatever the tests' result.
	HOST_UID="$(id -u)" HOST_GID="$(id -g)" \
		docker compose -p "${project}" -f compose.unit-tests.yml \
		run --rm --build backend pytest "$@" || status=$?

	docker compose -p "${project}" -f compose.unit-tests.yml \
		down --volumes --remove-orphans >/dev/null 2>&1 || true

	return "${status}"
}

run_migrations() {
	echo "==> migrations (on a throwaway Postgres)"
	scripts/migrate.sh check
}

run_frontend() {
	echo "==> vitest frontend"
	scripts/frontend.sh test:ci
}

case "${1:-}" in
	"")
		run_bats
		run_backend
		run_migrations
		run_frontend
		;;
	scripts/tests)
		run_bats
		;;
	backend)
		shift
		run_backend "$@"
		;;
	migrations)
		run_migrations
		;;
	frontend)
		run_frontend
		;;
	*)
		echo "Usage: scripts/test.sh [scripts/tests | backend [pytest args] | migrations | frontend]" >&2
		exit 2
		;;
esac
