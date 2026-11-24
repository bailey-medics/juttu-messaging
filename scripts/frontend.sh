#!/usr/bin/env bash
# Run an npm script in the frontend, from anywhere in the repository.
# Ported from Turva.
#
#   scripts/frontend.sh install     install the locked packages
#   scripts/frontend.sh dev         the Vite dev server, on 5273 (JUTTU_FRONTEND_PORT)
#   scripts/frontend.sh storybook   Storybook, on 6106 (JUTTU_STORYBOOK_PORT)
#   scripts/frontend.sh test:ci     Vitest, once
#   scripts/frontend.sh <script>    any other script in frontend/package.json
#
# With no arguments, runs the whole frontend gate, in the order CI runs it:
# types, lint, format, tests, the build and the Storybook build.
#
# Runs on the host: npm wants a node_modules it owns, and lint-staged in
# the git hook needs the same one.
set -euo pipefail

cd "$(dirname "$0")/../frontend"

if ! command -v npm >/dev/null 2>&1; then
	echo "npm not found. The frontend needs Node 26 or newer." >&2
	exit 1
fi

if [ "${1:-}" = "install" ]; then
	shift
	exec npm ci --no-fund --no-audit "$@"
fi

# An empty or stale node_modules is not evidence the locked packages are
# installed, so look for a tool the scripts need.
if [ ! -x node_modules/.bin/vite ]; then
	echo "==> installing the frontend's packages"
	npm ci --no-fund --no-audit
fi

if [ "$#" -eq 0 ]; then
	echo "==> typecheck"
	npm run typecheck
	echo "==> lint"
	npm run lint
	echo "==> format check"
	npm run format
	echo "==> test"
	npm run test:ci
	echo "==> build"
	npm run build
	echo "==> storybook build"
	npm run build-storybook
	exit 0
fi

exec npm run "$@"
