#!/usr/bin/env bats
# Tests for s/up, s/down and s/rebuild. A stand-in docker records what each
# asked for, so no container is started.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s/utils" "${bin}"
	for script in up down rebuild utils/dev-stack.sh; do
		cp "${BATS_TEST_DIRNAME}/../${script}" "${repo}/s/${script}"
	done

	cat >"${bin}/docker" <<STUB
#!/usr/bin/env bash
echo "HOST_UID=\${HOST_UID:-} docker \$*" >>"${BATS_TEST_TMPDIR}/calls"
STUB
	chmod +x "${bin}/docker"
}

calls() {
	cat "${BATS_TEST_TMPDIR}/calls"
}

run_script() {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/$1" "${@:2}"
}

@test "s/up starts the dev stack and waits for it to be healthy" {
	run_script up

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"docker compose -f compose.dev.yml up --detach --wait" ]]
	[[ "$output" == *"http://localhost:8180"* ]]
}

@test "s/up passes its arguments on to Compose" {
	run_script up --build backend

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"up --detach --wait --build backend" ]]
}

@test "s/up names the HTTP port .env moved it to" {
	run env PATH="${bin}:/usr/bin:/bin" JUTTU_HTTP_PORT=9180 "${repo}/s/up"

	[[ "$output" == *"http://localhost:9180"* ]]
}

@test "the stack runs as the host user, so what it writes stays theirs" {
	run_script up

	[[ "$(calls)" == "HOST_UID=$(id -u) docker"* ]]
}

@test "s/down stops the stack and keeps the volumes" {
	run_script down

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"docker compose -f compose.dev.yml down" ]]
}

@test "s/down --volumes passes the flag on" {
	run_script down --volumes

	[[ "$(calls)" == *"down --volumes" ]]
}

@test "s/rebuild pulls, rebuilds, drops the frontend's packages and starts again" {
	run_script rebuild

	[ "$status" -eq 0 ]
	[[ "$(calls | sed -n 1p)" == *"compose -f compose.dev.yml build --pull" ]]
	[[ "$(calls | sed -n 2p)" == *"compose -f compose.dev.yml down" ]]
	[[ "$(calls | sed -n 3p)" == *"docker volume rm --force juttu_frontend_node_modules" ]]
	[[ "$(calls | sed -n 4p)" == *"up --detach --wait" ]]
}

@test "s/rebuild backend keeps the frontend's packages" {
	run_script rebuild backend

	[ "$status" -eq 0 ]
	[[ "$(calls | sed -n 1p)" == *"build --pull backend" ]]
	run grep -c 'volume rm' "${BATS_TEST_TMPDIR}/calls"
	[ "$output" = "0" ]
}
