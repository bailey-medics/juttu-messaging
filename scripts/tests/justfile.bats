#!/usr/bin/env bats
# Tests that the justfile's recipes reach the scripts in scripts/. Each test
# asks just for the recipe's commands with --dry-run, so nothing is run.
bats_require_minimum_version 1.5.0

setup() {
	cd "${BATS_TEST_DIRNAME}/../.." || return 1
}

@test "just setup switches the hook on through scripts/install-hooks.sh" {
	run just --dry-run setup

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/install-hooks.sh"* ]]
}

@test "just lint passes its arguments to scripts/lint.sh" {
	run just --dry-run lint cspell

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/lint.sh cspell"* ]]
}

@test "just test runs scripts/test.sh" {
	run just --dry-run test

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/test.sh"* ]]
}

@test "just unit-tests-backend passes pytest's arguments to scripts/test.sh" {
	run just --dry-run unit-tests-backend -k health

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/test.sh backend -k health"* ]]
}

@test "just migrate writes a migration through scripts/migrate.sh new" {
	run just --dry-run migrate "add users"

	[ "$status" -eq 0 ]
	[[ "$output" == *'./scripts/migrate.sh new "add users"'* ]]
}

@test "just frontend passes its arguments to scripts/frontend.sh" {
	run just --dry-run frontend dev

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/frontend.sh dev"* ]]
}

@test "just storybook starts Storybook through scripts/frontend.sh" {
	run just --dry-run storybook

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/frontend.sh storybook"* ]]
}

@test "just up, down and rebuild reach their scripts" {
	run just --dry-run up --build
	[[ "$output" == *"./scripts/up.sh --build"* ]]

	run just --dry-run down
	[[ "$output" == *"./scripts/down.sh"* ]]

	run just --dry-run rebuild backend
	[[ "$output" == *"./scripts/rebuild.sh backend"* ]]
}

@test "just worktree makes a worktree through scripts/worktree.sh" {
	run just --dry-run worktree feature/new-thing

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/worktree.sh feature/new-thing"* ]]
}

@test "just box-deploy deploys main through scripts/box.sh" {
	run just --dry-run box-deploy

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/box.sh deploy"* ]]
}

@test "just first-account and box-first-account reach their scripts" {
	run just --dry-run first-account
	[[ "$output" == *"./scripts/first-account.sh"* ]]

	run just --dry-run box-first-account
	[[ "$output" == *"./scripts/box.sh first-account"* ]]
}

@test "just terraform passes its arguments to scripts/terraform.sh" {
	run just --dry-run terraform plan -no-color

	[ "$status" -eq 0 ]
	[[ "$output" == *"./scripts/terraform.sh plan -no-color"* ]]
}
