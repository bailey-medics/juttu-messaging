#!/usr/bin/env bats
# Tests for s/box, which deploys the long-running copy on the dev box. Each
# test makes a throwaway origin and checkout, and a stand-in docker records
# what s/box asked of it, so nothing is built or started.
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
	echo "name: juttu-box # from main" >"${repo}/compose.box.yml"
	git -C "${repo}" add compose.box.yml
	git -C "${repo}" commit -q -m main
	git -C "${repo}" push -q origin main

	mkdir -p "${repo}/s"
	cp "${BATS_TEST_DIRNAME}/../box" "${repo}/s/box"

	cat >"${bin}/docker" <<STUB
#!/usr/bin/env bash
echo "JUTTU_BOX_TAG=\${JUTTU_BOX_TAG:-} docker \$*" >>"${BATS_TEST_TMPDIR}/calls"
echo "\${JUTTU_BOX_ALLOWED_HOSTS:-}" >>"${BATS_TEST_TMPDIR}/hosts"
STUB
	chmod +x "${bin}/docker"
}

box() {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/s/box" "$@"
}

calls() {
	cat "${BATS_TEST_TMPDIR}/calls"
}

@test "deploy builds and starts the latest origin/main as juttu-box" {
	box deploy

	[ "$status" -eq 0 ]
	local tag
	tag="$(git -C "${repo}" rev-parse --short=12 origin/main)"
	[[ "$(calls)" == "JUTTU_BOX_TAG=${tag} docker compose -p juttu-box --env-file ${repo}/local/box.env -f ${repo}/local/box-build/compose.box.yml up --detach --build --wait --remove-orphans" ]]
	[ "$(cat "${repo}/local/box-deployed")" = "${tag}" ]
}

@test "deploy builds from main, never from the working tree" {
	echo "name: changed-but-not-committed" >"${repo}/compose.box.yml"

	box deploy

	[ "$status" -eq 0 ]
	[ "$(cat "${repo}/local/box-build/compose.box.yml")" = "name: juttu-box # from main" ]
}

@test "the first deploy makes local/box.env with a random password and key, readable by its owner only" {
	box deploy

	[ -f "${repo}/local/box.env" ]
	[ "$(stat -c '%a' "${repo}/local/box.env")" = "600" ]
	run grep -E '^JUTTU_BOX_POSTGRES_PASSWORD=[0-9a-f]{48}$' "${repo}/local/box.env"
	[ "$status" -eq 0 ]
	run grep -E '^JUTTU_BOX_SECRET_KEY=[0-9a-f]{64}$' "${repo}/local/box.env"
	[ "$status" -eq 0 ]
}

@test "the backend answers this machine and the address phones open, without its port" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=x\nJUTTU_BOX_SECRET_KEY=y\nJUTTU_BOX_ADDRESS=box.example:8290\n' >"${repo}/local/box.env"

	box deploy

	[ "$(cat "${BATS_TEST_TMPDIR}/hosts")" = "localhost,127.0.0.1,box.example" ]
}

@test "with no address yet, the backend answers this machine only" {
	box deploy

	[ "$(cat "${BATS_TEST_TMPDIR}/hosts")" = "localhost,127.0.0.1" ]
}

@test "an existing local/box.env keeps its values, and gains a secret key if it lacks one" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=kept\n' >"${repo}/local/box.env"

	box deploy

	[ "$(head -1 "${repo}/local/box.env")" = "JUTTU_BOX_POSTGRES_PASSWORD=kept" ]
	run grep -cE '^JUTTU_BOX_SECRET_KEY=[0-9a-f]{64}$' "${repo}/local/box.env"
	[ "$output" = "1" ]
}

@test "a secret key already there is never replaced" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=kept\nJUTTU_BOX_SECRET_KEY=mine\n' >"${repo}/local/box.env"

	box deploy

	run grep -c '^JUTTU_BOX_SECRET_KEY=' "${repo}/local/box.env"
	[ "$output" = "1" ]
	grep -qx 'JUTTU_BOX_SECRET_KEY=mine' "${repo}/local/box.env"
}

@test "deploy prints the address phones open, when local/box.env names it" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=x\nJUTTU_BOX_ADDRESS=box.example:8290\n' >"${repo}/local/box.env"

	box deploy

	[[ "$output" == *"Phones open https://box.example:8290"* ]]
}

@test "a ref with no compose.box.yml is refused before anything is built" {
	git -C "${repo}" rm -q compose.box.yml
	git -C "${repo}" commit -q -m "no box"

	box deploy HEAD

	[ "$status" -eq 1 ]
	[[ "$output" == *"no compose.box.yml"* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}

@test "an unknown ref is refused" {
	box deploy no-such-branch

	[ "$status" -eq 1 ]
	[[ "$output" == *"No commit called no-such-branch"* ]]
}

@test "status names the deployed commit" {
	box deploy
	box status

	[ "$status" -eq 0 ]
	[[ "$output" == *"Deployed commit: $(git -C "${repo}" rev-parse --short=12 origin/main)"* ]]
}

@test "down stops the copy and keeps its database" {
	box down

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"-p juttu-box "*" down" ]]
}

@test "an unknown command is refused" {
	box restart

	[ "$status" -eq 2 ]
}
