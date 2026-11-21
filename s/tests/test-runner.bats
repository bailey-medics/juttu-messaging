#!/usr/bin/env bats
# Tests for s/test's routing. A stand-in docker and bats on PATH record
# what s/test asked of them, so no container is started.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/Juttu Work"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s/utils" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../test" "${repo}/s/test"
	cp "${BATS_TEST_DIRNAME}/../utils/project-name.sh" "${repo}/s/utils/project-name.sh"

	# Stand-ins for s/migrate and s/frontend, recorded like the tools below.
	for script in migrate frontend; do
		cat >"${repo}/s/${script}" <<STUB
#!/usr/bin/env bash
echo "s/${script} \$*" >>"${BATS_TEST_TMPDIR}/calls"
STUB
		chmod +x "${repo}/s/${script}"
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
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test"

	[ "$status" -eq 0 ]
	[ "$(calls | head -1)" = "bats s/tests" ]
	[[ "$(calls | sed -n 2p)" == "docker compose "*" run --rm --build backend pytest" ]]
	[[ "$(calls | sed -n 3p)" == "docker compose "*" down --volumes --remove-orphans" ]]
	[ "$(calls | sed -n 4p)" = "s/migrate check" ]
	[ "$(calls | sed -n 5p)" = "s/frontend test:ci" ]
}

@test "frontend runs only the frontend's Vitest suite" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" frontend

	[ "$status" -eq 0 ]
	[ "$(calls)" = "s/frontend test:ci" ]
}

@test "migrations runs only the migration check" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" migrations

	[ "$status" -eq 0 ]
	[ "$(calls)" = "s/migrate check" ]
}

@test "s/tests runs only the bats tests" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" s/tests

	[ "$status" -eq 0 ]
	[ "$(calls)" = "bats s/tests" ]
}

@test "backend passes its arguments on to pytest" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" backend -k health

	[ "$status" -eq 0 ]
	grep -q "run --rm --build backend pytest -k health$" "${BATS_TEST_TMPDIR}/calls"
}

@test "each worktree gets a compose project named from its folder" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" backend

	[ "$status" -eq 0 ]
	grep -q -- "-p juttu-test-juttu-work " "${BATS_TEST_TMPDIR}/calls"
}

@test "an unknown suite is refused" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" e2e

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

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" backend

	[ "$status" -eq 1 ]
	[[ "$(calls | tail -1)" == *"down --volumes --remove-orphans" ]]
}
