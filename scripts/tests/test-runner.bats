#!/usr/bin/env bats
# Tests for scripts/test.sh's routing. A stand-in docker and bats on PATH record
# what scripts/test.sh asked of them, so no container is started.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/Juttu Work"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/scripts/utils" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../test.sh" "${repo}/scripts/test.sh"
	cp "${BATS_TEST_DIRNAME}/../utils/project-name.sh" "${repo}/scripts/utils/project-name.sh"

	# Stand-ins for scripts/migrate.sh and scripts/frontend.sh, recorded like the
	# tools below.
	for script in migrate frontend; do
		cat >"${repo}/scripts/${script}.sh" <<STUB
#!/usr/bin/env bash
echo "scripts/${script}.sh \$*" >>"${BATS_TEST_TMPDIR}/calls"
STUB
		chmod +x "${repo}/scripts/${script}.sh"
	done

	for tool in docker bats; do
		cat >"${bin}/${tool}" <<STUB
#!/usr/bin/env bash
echo "${tool} \$*" >>"${BATS_TEST_TMPDIR}/calls"
STUB
		chmod +x "${bin}/${tool}"
	done
}

calls() {
	cat "${BATS_TEST_TMPDIR}/calls"
}

@test "no argument runs the bats, backend, migration and frontend suites in turn" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh"

	[ "$status" -eq 0 ]
	[ "$(calls | head -1)" = "bats scripts/tests" ]
	[[ "$(calls | sed -n 2p)" == "docker compose "*" run --rm --build backend pytest" ]]
	[[ "$(calls | sed -n 3p)" == "docker compose "*" down --volumes --remove-orphans" ]]
	[ "$(calls | sed -n 4p)" = "scripts/migrate.sh check" ]
	[ "$(calls | sed -n 5p)" = "scripts/frontend.sh test:ci" ]
}

@test "frontend runs only the frontend's Vitest suite" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" frontend

	[ "$status" -eq 0 ]
	[ "$(calls)" = "scripts/frontend.sh test:ci" ]
}

@test "migrations runs only the migration check" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" migrations

	[ "$status" -eq 0 ]
	[ "$(calls)" = "scripts/migrate.sh check" ]
}

@test "scripts/tests runs only the bats tests" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" scripts/tests

	[ "$status" -eq 0 ]
	[ "$(calls)" = "bats scripts/tests" ]
}

@test "backend passes its arguments on to pytest" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" backend -k health

	[ "$status" -eq 0 ]
	grep -q "run --rm --build backend pytest -k health$" "${BATS_TEST_TMPDIR}/calls"
}

@test "each worktree gets a compose project named from its folder" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" backend

	[ "$status" -eq 0 ]
	grep -q -- "-p juttu-test-juttu-work " "${BATS_TEST_TMPDIR}/calls"
}

@test "an unknown suite is refused" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" e2e

	[ "$status" -eq 2 ]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}

@test "the backend tests' Postgres is removed afterwards, pass or fail" {
	cat >"${bin}/docker" <<STUB
#!/usr/bin/env bash
echo "docker \$*" >>"${BATS_TEST_TMPDIR}/calls"
[[ " \$* " == *" run "* ]] && exit 1
exit 0
STUB
	chmod +x "${bin}/docker"

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/test.sh" backend

	[ "$status" -eq 1 ]
	[[ "$(calls | tail -1)" == *"down --volumes --remove-orphans" ]]
}
