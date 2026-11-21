#!/usr/bin/env bats
# Tests for s/utils/project-name.sh, which names a Compose project after
# the worktree it runs in.
bats_require_minimum_version 1.5.0

setup() {
	# shellcheck source=s/utils/project-name.sh
	source "${BATS_TEST_DIRNAME}/../utils/project-name.sh"
}

@test "the name is the prefix and the worktree's folder" {
	mkdir -p "${BATS_TEST_TMPDIR}/juttu-messaging-2"
	cd "${BATS_TEST_TMPDIR}/juttu-messaging-2" || return 1

	run project_name juttu-test

	[ "$output" = "juttu-test-juttu-messaging-2" ]
}

@test "capitals and spaces become a name Compose accepts" {
	mkdir -p "${BATS_TEST_TMPDIR}/My Work.Tree"
	cd "${BATS_TEST_TMPDIR}/My Work.Tree" || return 1

	run project_name juttu-migrate

	[ "$output" = "juttu-migrate-my-work-tree" ]
}
