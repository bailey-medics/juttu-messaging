#!/usr/bin/env bash
# Django migrations, on a throwaway Postgres. Ported from Quill Medical.
#
# Usage:
#   scripts/migrate.sh new "<message>"   write a migration for this worktree's model
#                               changes, and fail if there are none
#   scripts/migrate.sh check             prove the migrations apply from nothing,
#                               undo to nothing, apply again, and leave no
#                               difference from the models
#
# Both run against compose.migrate.yml: a Postgres in memory, compared
# against THIS worktree's models and migrations, then thrown away. Neither
# needs the dev stack.
set -euo pipefail

usage() {
	echo "Usage: scripts/migrate.sh new \"<message>\" | scripts/migrate.sh check" >&2
	exit 2
}

compose() {
	HOST_UID="$(id -u)" HOST_GID="$(id -g)" \
		docker compose -p "$(project_name juttu-migrate)" -f compose.migrate.yml "$@"
}

# A migration name Django accepts, from a message: "Add users!" becomes
# "add_users".
migration_name() {
	printf '%s' "$1" \
		| tr '[:upper:]' '[:lower:]' \
		| tr -c 'a-z0-9' '_' \
		| sed -E 's/_+/_/g; s/^_//; s/_$//'
}

# Every migration file in the backend, one a line.
migration_files() {
	find backend -path '*/migrations/[0-9]*.py' -type f 2>/dev/null | sort
}

new_migration() {
	local name before output new file

	name="$(migration_name "$1")"
	if [ -z "${name}" ]; then
		echo "The message has no letters or digits to name the migration with." >&2
		exit 2
	fi

	before="$(migration_files)"

	# The name reaches the container's shell as "$1", an argument, never
	# pasted into the command, so no message can break out of it.
	# shellcheck disable=SC2016
	output="$(compose run --rm --build migrate \
		sh -c 'python manage.py migrate && python manage.py makemigrations --name "$1"' \
		sh "${name}" 2>&1)" || {
		echo "${output}"
		exit 1
	}
	echo "${output}"

	# makemigrations writes nothing when the models already match, and
	# says so, and exits zero. Say so plainly and fail, rather than let the
	# command look as though it worked.
	if [[ "${output}" == *"No changes detected"* ]]; then
		echo "No migration was written: the models already match the migrations." >&2
		echo "Check the model change is saved." >&2
		exit 1
	fi

	new="$(comm -13 <(echo "${before}") <(migration_files))"
	if [ -z "${new}" ]; then
		echo "No migration was written." >&2
		exit 1
	fi

	echo
	echo "Created:"
	while IFS= read -r file; do
		echo "  ${file}"
	done <<<"${new}"
	echo "Review each one before committing."
}

# Apply every migration, undo each of Juttu's own apps to nothing, apply
# again, then check the models and the migrations agree.
check_migrations() {
	# The script runs in the container; $d is expanded there.
	# shellcheck disable=SC2016
	compose run --rm --build migrate sh -c '
		set -e
		python manage.py migrate
		for d in */migrations; do
			if ls "$d"/0*.py >/dev/null 2>&1; then
				python manage.py migrate "$(dirname "$d")" zero
			fi
		done
		python manage.py migrate
		python manage.py makemigrations --check --dry-run
	'
}

main() {
	local status=0

	cd "$(dirname "${BASH_SOURCE[0]}")/.."

	# shellcheck source=utils/project-name.sh
	source scripts/utils/project-name.sh

	case "${1:-}" in
		new)
			[ "$#" -eq 2 ] && [ -n "$2" ] || usage
			trap 'compose down --volumes --remove-orphans >/dev/null 2>&1' EXIT
			new_migration "$2" || status=$?
			;;
		check)
			[ "$#" -eq 1 ] || usage
			trap 'compose down --volumes --remove-orphans >/dev/null 2>&1' EXIT
			check_migrations || status=$?
			;;
		*)
			usage
			;;
	esac

	return "${status}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
	main "$@"
fi
