#!/usr/bin/env bats
# Tests for s/worktree. Each test makes a throwaway origin and checkout, and
# puts stand-in poetry and npm on PATH, so nothing is installed.
bats_require_minimum_version 1.5.0

setup() {
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.com
	export GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.com

	work="${BATS_TEST_TMPDIR}/work"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${work}" "${bin}"

	git init -q --bare -b main "${work}/origin.git"
	git clone -q "${work}/origin.git" "${work}/juttu" 2>/dev/null
	repo="${work}/juttu"
	mkdir -p "${repo}/s" "${repo}/backend" "${repo}/frontend"
	cp "${BATS_TEST_DIRNAME}/../worktree" "${repo}/s/worktree"
	touch "${repo}/backend/.keep" "${repo}/frontend/.keep"
	git -C "${repo}" add -A
	git -C "${repo}" commit -q -m start
	git -C "${repo}" push -q origin main

	for tool in poetry npm; do
		cat >"${bin}/${tool}" <<STUB
#!/usr/bin/env bash
echo "${tool} \$* in \$(basename "\$(dirname "\$PWD")")/\$(basename "\$PWD")" >>"${BATS_TEST_TMPDIR}/calls"
STUB
		chmod +x "${bin}/${tool}"
	done
}

make_worktree() {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/worktree" "$@"
}

@test "a new branch gets a sibling worktree cut from origin/main" {
	make_worktree feature/new-thing

	[ "$status" -eq 0 ]
	[ -d "${work}/juttu-2" ]
	[ "$(git -C "${work}/juttu-2" branch --show-current)" = "feature/new-thing" ]
	[ "$(git -C "${work}/juttu-2" rev-parse HEAD)" = "$(git -C "${repo}" rev-parse origin/main)" ]
}

@test "the new branch has no upstream, so a bare push cannot reach main" {
	make_worktree feature/new-thing

	run git -C "${work}/juttu-2" rev-parse --abbrev-ref "feature/new-thing@{upstream}"
	[ "$status" -ne 0 ]
}

@test "the next free number is used" {
	mkdir -p "${work}/juttu-2"

	make_worktree feature/new-thing

	[ "$status" -eq 0 ]
	[ -d "${work}/juttu-3/.git" ] || [ -f "${work}/juttu-3/.git" ]
}

@test "a branch on origin is resumed, not cut again from main" {
	git -C "${repo}" switch -q -c feature/started
	echo work >"${repo}/work.txt"
	git -C "${repo}" add work.txt
	git -C "${repo}" commit -q -m work
	git -C "${repo}" push -q origin feature/started
	git -C "${repo}" switch -q main
	git -C "${repo}" branch -q -D feature/started

	make_worktree feature/started

	[ "$status" -eq 0 ]
	[ -f "${work}/juttu-2/work.txt" ]
}

@test "this checkout's .env is copied across" {
	echo "JUTTU_HTTP_PORT=9180" >"${repo}/.env"

	make_worktree feature/new-thing

	[ "$(cat "${work}/juttu-2/.env")" = "JUTTU_HTTP_PORT=9180" ]
}

@test "the backend gets its own environment and the frontend its packages" {
	make_worktree feature/new-thing

	grep -qx "poetry install --no-interaction in juttu-2/backend" "${BATS_TEST_TMPDIR}/calls"
	grep -qx "npm ci --no-fund --no-audit in juttu-2/frontend" "${BATS_TEST_TMPDIR}/calls"
}

@test "a branch outside feature/ is refused before anything is made" {
	make_worktree fix-it

	[ "$status" -eq 2 ]
	[ ! -e "${work}/juttu-2" ]
}

@test "no branch is refused" {
	make_worktree

	[ "$status" -eq 2 ]
}
