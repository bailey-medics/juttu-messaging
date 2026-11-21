#!/usr/bin/env bats
# Tests that the justfile's recipes reach the scripts in s/. Each test asks
# just for the recipe's commands with --dry-run, so nothing is run.
bats_require_minimum_version 1.5.0

setup() {
	cd "${BATS_TEST_DIRNAME}/../.." || return 1
}

@test "just setup switches the hook on through s/install-hooks" {
	run just --dry-run setup

	[ "$status" -eq 0 ]
	[[ "$output" == *"./s/install-hooks"* ]]
}

@test "just lint passes its arguments to s/lint" {
	run just --dry-run lint cspell

	[ "$status" -eq 0 ]
	[[ "$output" == *"./s/lint cspell"* ]]
}

@test "just test runs s/test" {
	run just --dry-run test

	[ "$status" -eq 0 ]
	[[ "$output" == *"./s/test"* ]]
}

@test "just unit-tests-backend passes pytest's arguments to s/test" {
	run just --dry-run unit-tests-backend -k health

	[ "$status" -eq 0 ]
	[[ "$output" == *"./s/test backend -k health"* ]]
}
