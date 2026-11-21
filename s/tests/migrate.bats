#!/usr/bin/env bats
# Tests for s/migrate. A stand-in docker records each call and, for a `run`,
# answers as Django's makemigrations would, so no container is started.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s/utils" "${repo}/backend/app/migrations" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../migrate" "${repo}/s/migrate"
	cp "${BATS_TEST_DIRNAME}/../utils/project-name.sh" "${repo}/s/utils/project-name.sh"

	# shellcheck source=s/migrate
	source "${BATS_TEST_DIRNAME}/../migrate"
}

# A stand-in docker. With MAKEMIGRATIONS=writes, a `run` writes a migration
# as Django would; with MAKEMIGRATIONS=nothing, it says "No changes
# detected" and writes nothing, as Django does.
stub_docker() {
	cat >"${bin}/docker" <<STUB
#!/usr/bin/env bash
echo "docker \$*" >>"${BATS_TEST_TMPDIR}/calls"
if [[ " \$* " == *" run "* ]]; then
	case "\${MAKEMIGRATIONS:-}" in
		writes) touch "${repo}/backend/app/migrations/0001_add_users.py"; echo "  - Create model User" ;;
		nothing) echo "No changes detected" ;;
	esac
fi
STUB
	chmod +x "${bin}/docker"
}

migrate_with() {
	run env PATH="${bin}:/usr/bin:/bin" MAKEMIGRATIONS="$1" "${repo}/s/migrate" "${@:2}"
}

@test "a message becomes a migration name Django accepts" {
	run migration_name "Add users, and their roles!"

	[ "$output" = "add_users_and_their_roles" ]
}

@test "new writes a migration and names the file" {
	stub_docker

	migrate_with writes new "add users"

	[ "$status" -eq 0 ]
	[[ "$output" == *"backend/app/migrations/0001_add_users.py"* ]]
	grep -q 'makemigrations --name' "${BATS_TEST_TMPDIR}/calls"
	grep -q ' add_users$' "${BATS_TEST_TMPDIR}/calls"
}

@test "new fails when the models already match the migrations" {
	stub_docker

	migrate_with nothing new "nothing changed"

	[ "$status" -eq 1 ]
	[[ "$output" == *"the models already match the migrations"* ]]
}

@test "new fails when makemigrations wrote no file" {
	stub_docker

	migrate_with "" new "nothing at all"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No migration was written"* ]]
}

@test "a message with no letters or digits is refused" {
	stub_docker

	migrate_with writes new "!!!"

	[ "$status" -eq 2 ]
}

@test "check applies, undoes each app to nothing, applies again and compares" {
	stub_docker

	migrate_with "" check

	[ "$status" -eq 0 ]
	grep -qF ' zero' "${BATS_TEST_TMPDIR}/calls"
	grep -q 'makemigrations --check --dry-run' "${BATS_TEST_TMPDIR}/calls"
}

@test "the throwaway database is removed afterwards" {
	stub_docker

	migrate_with "" check

	grep -q 'down --volumes --remove-orphans' "${BATS_TEST_TMPDIR}/calls"
}

@test "new without a message is refused" {
	run "${repo}/s/migrate" new

	[ "$status" -eq 2 ]
}

@test "an unknown command is refused" {
	run "${repo}/s/migrate" squash

	[ "$status" -eq 2 ]
}
