#!/usr/bin/env bash
# Make the first account on the development stack, asking for its username
# and password.
#
# Usage: scripts/first-account.sh
#
# Runs once per database: the command refuses once any account exists, because
# every later account comes from an invite. The stack must be up
# (scripts/up.sh). For the copy on the dev box, use scripts/box.sh
# first-account.
set -euo pipefail

main() {
	cd "$(dirname "${BASH_SOURCE[0]}")/.."

	# shellcheck source=utils/dev-stack.sh
	source scripts/utils/dev-stack.sh

	dev_stack exec backend python manage.py create_first_account
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
	main "$@"
fi
