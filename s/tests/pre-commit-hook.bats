#!/usr/bin/env bats
# Tests for .githooks/pre-commit, the tracked hook that runs pre-commit on
# the staged files. Each test copies the hook into a throwaway repository
# and puts a stand-in pre-commit on PATH, so no real hook runs.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/.githooks" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../../.githooks/pre-commit" "${repo}/.githooks/pre-commit"
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	git -C "${repo}" init -q
}

# A stand-in pre-commit that records its arguments and exits with $1.
stub_pre_commit() {
	local where="$1"
	local code="$2"

	mkdir -p "${where}"
	cat >"${where}/pre-commit" <<STUB
#!/usr/bin/env bash
echo "\$@" >"${BATS_TEST_TMPDIR}/called"
exit ${code}
STUB
	chmod +x "${where}/pre-commit"
}

@test "the hook runs pre-commit on the staged files" {
	stub_pre_commit "${bin}" 0

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/called")" = "run" ]
}

@test "a failing check stops the commit" {
	stub_pre_commit "${bin}" 1

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 1 ]
}

@test "the repository's .venv copy wins over the one on PATH" {
	stub_pre_commit "${bin}" 1
	stub_pre_commit "${repo}/.venv/bin" 0

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 0 ]
}

@test "a missing pre-commit stops the commit and says how to install it" {
	run env PATH="/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 1 ]
	[[ "$output" == *"pre-commit not found"* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/called" ]
}

# A stand-in lint-staged in the frontend's node_modules.
stub_lint_staged() {
	mkdir -p "${repo}/frontend/node_modules/.bin"
	cat >"${repo}/frontend/node_modules/.bin/lint-staged" <<STUB
#!/usr/bin/env bash
pwd >"${BATS_TEST_TMPDIR}/lint-staged-ran-in"
STUB
	chmod +x "${repo}/frontend/node_modules/.bin/lint-staged"
}

@test "a staged frontend file runs lint-staged in frontend/" {
	stub_pre_commit "${bin}" 0
	stub_lint_staged
	echo "export {};" >"${repo}/frontend/main.ts"
	git -C "${repo}" add frontend/main.ts

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/lint-staged-ran-in")" = "$(cd "${repo}/frontend" && pwd)" ]
}

@test "a commit with no frontend file does not run lint-staged" {
	stub_pre_commit "${bin}" 0
	stub_lint_staged
	echo "notes" >"${repo}/notes.md"
	git -C "${repo}" add notes.md

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 0 ]
	[ ! -e "${BATS_TEST_TMPDIR}/lint-staged-ran-in" ]
}

@test "a staged frontend file with no packages installed stops the commit" {
	stub_pre_commit "${bin}" 0
	mkdir -p "${repo}/frontend"
	echo "export {};" >"${repo}/frontend/main.ts"
	git -C "${repo}" add frontend/main.ts

	run env PATH="${bin}:/usr/bin:/bin" "${repo}/.githooks/pre-commit"

	[ "$status" -eq 1 ]
	[[ "$output" == *"./s/frontend install"* ]]
}
