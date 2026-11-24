#!/usr/bin/env bats
# Tests for compose.box.yml itself, the services the box copy runs.
bats_require_minimum_version 1.5.0

setup() {
	compose="${BATS_TEST_DIRNAME}/../../compose.box.yml"
}

# Prints one service's lines from compose.box.yml: from its name up to the
# next service, or the end of the services.
service_block() {
	local name="$1"

	awk -v name="  ${name}:" '
		$0 == name { inside = 1; print; next }
		inside && /^  [^ #]/ { exit }
		inside && /^[^ #]/ { exit }
		inside { print }
	' "${compose}"
}

@test "the GitHub watcher turns off the backend image's health check, since it runs no web server" {
	run service_block github-watcher

	[ "$status" -eq 0 ]
	[[ "$output" == *"image: juttu-box-backend:"* ]]
	[[ "$output" == *$'    healthcheck:\n      disable: true'* ]]
}

@test "the backend keeps the health check its image gives it" {
	run service_block backend

	[ "$status" -eq 0 ]
	[[ "$output" == *"target: prod"* ]]
	run ! grep -q "healthcheck:" <<<"$output"
}
