#!/usr/bin/env bats
# Tests for s/test's routing. A stand-in docker and bats on PATH record
# what s/test asked of them, so no container is started.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/Juttu Work"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../test" "${repo}/s/test"

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

@test "no argument runs the bats tests and then the backend tests" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test"

	[ "$status" -eq 0 ]
	[ "$(calls | head -1)" = "bats s/tests" ]
	[[ "$(calls | sed -n 2p)" == "docker compose "*" run --rm --build backend pytest" ]]
}

@test "s/tests runs only the bats tests" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" s/tests

	[ "$status" -eq 0 ]
	[ "$(calls)" = "bats s/tests" ]
}

@test "backend passes its arguments on to pytest" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" backend -k health

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"backend pytest -k health" ]]
}

@test "each worktree gets a compose project named from its folder" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" backend

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"-p juttu-test-juttu-work "* ]]
}

@test "an unknown suite is refused" {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/test" frontend

	[ "$status" -eq 2 ]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}
