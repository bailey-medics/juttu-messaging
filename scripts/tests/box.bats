#!/usr/bin/env bats
# Tests for scripts/box.sh, which deploys the long-running copy on the dev box.
# Each test makes a throwaway origin and checkout, and a stand-in docker records
# what scripts/box.sh asked of it, so nothing is built or started.
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

	mkdir -p "${repo}/scripts"
	cp "${BATS_TEST_DIRNAME}/../box.sh" "${repo}/scripts/box.sh"

	cat >"${bin}/docker" <<STUB
#!/usr/bin/env bash
echo "JUTTU_BOX_TAG=\${JUTTU_BOX_TAG:-} docker \$*" >>"${BATS_TEST_TMPDIR}/calls"
echo "\${JUTTU_BOX_ALLOWED_HOSTS:-}" >>"${BATS_TEST_TMPDIR}/hosts"
echo "\${JUTTU_BOX_TRUSTED_ORIGINS-unset}" >>"${BATS_TEST_TMPDIR}/origins"
exit "\${DOCKER_EXIT:-0}"
STUB
	chmod +x "${bin}/docker"

	cat >"${bin}/curl" <<STUB
#!/usr/bin/env bash
echo "\$*" >>"${BATS_TEST_TMPDIR}/curl"
cat >>"${BATS_TEST_TMPDIR}/curl-stdin"
exit "\${CURL_EXIT:-0}"
STUB
	chmod +x "${bin}/curl"
}

# A local/box.env with a sender's secret, so deploys send their card.
with_inlet_secret() {
	mkdir -p "${repo}/local"
	cat >"${repo}/local/box.env" <<'EOF'
JUTTU_BOX_POSTGRES_PASSWORD=x
JUTTU_BOX_SECRET_KEY=y
JUTTU_BOX_PORT=8290
JUTTU_BOX_INLET_SECRET=7.made-up-secret
EOF
}

# The JSON body of each event sent, one a line.
card_events() {
	sed -n 's/.*--data-binary \(.*\) http:.*/\1/p' "${BATS_TEST_TMPDIR}/curl"
}

box() {
	run env PATH="${bin}:/usr/bin:/bin" "${repo}/scripts/box.sh" "$@"
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

@test "first-account makes the first account in the running copy" {
	box first-account

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"-p juttu-box "*" exec backend python manage.py create_first_account" ]]
}

@test "the backend trusts the HTTPS address phones open, for its CSRF check" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=x\nJUTTU_BOX_SECRET_KEY=y\nJUTTU_BOX_ADDRESS=box.example:8290\n' >"${repo}/local/box.env"

	box deploy

	[ "$(cat "${BATS_TEST_TMPDIR}/origins")" = "https://box.example:8290" ]
}

@test "no origin is trusted before the address is set, but the setting is still passed" {
	box deploy

	[ "$(cat "${BATS_TEST_TMPDIR}/origins")" = "" ]
}

@test "push-keys adds a pair of keys from the backend to local/box.env, readable by its owner only" {
	cat >"${bin}/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"${BATS_TEST_TMPDIR}/calls"
echo "JUTTU_BOX_VAPID_PUBLIC_KEY=BPublic-key_1"
echo "JUTTU_BOX_VAPID_PRIVATE_KEY=private_Key-2"
STUB

	box push-keys mailto:team@juttu.example

	[ "$status" -eq 0 ]
	[[ "$(calls)" == *"-p juttu-box "*" run --rm --no-deps -T backend python manage.py generate_push_keys --prefix JUTTU_BOX_VAPID_" ]]
	grep -qx 'JUTTU_BOX_VAPID_CONTACT=mailto:team@juttu.example' "${repo}/local/box.env"
	grep -qx 'JUTTU_BOX_VAPID_PUBLIC_KEY=BPublic-key_1' "${repo}/local/box.env"
	grep -qx 'JUTTU_BOX_VAPID_PRIVATE_KEY=private_Key-2' "${repo}/local/box.env"
	[ "$(stat -c %a "${repo}/local/box.env")" = "600" ]
}

@test "push-keys keeps keys already there, and asks the backend for nothing" {
	mkdir -p "${repo}/local"
	printf 'JUTTU_BOX_POSTGRES_PASSWORD=x\nJUTTU_BOX_SECRET_KEY=y\nJUTTU_BOX_VAPID_PUBLIC_KEY=mine\nJUTTU_BOX_VAPID_PRIVATE_KEY=mine-too\n' >"${repo}/local/box.env"

	box push-keys https://juttu.example

	[ "$status" -eq 0 ]
	[ ! -f "${BATS_TEST_TMPDIR}/calls" ]
	[ "$(grep -c '^JUTTU_BOX_VAPID_PRIVATE_KEY=' "${repo}/local/box.env")" -eq 1 ]
	grep -qx 'JUTTU_BOX_VAPID_PRIVATE_KEY=mine-too' "${repo}/local/box.env"
}

@test "push-keys adds nothing when the backend does not print a pair" {
	cat >"${bin}/docker" <<'STUB'
#!/usr/bin/env bash
echo "something went wrong"
STUB

	box push-keys https://juttu.example

	[ "$status" -eq 1 ]
	run grep -c 'VAPID' "${repo}/local/box.env"
	[ "$output" = "0" ]
}

@test "push-keys needs a contact the push services accept" {
	box push-keys
	[ "$status" -eq 2 ]

	for contact in team@juttu.example https://juttu.example/team http://juttu.example; do
		box push-keys "${contact}"
		[ "$status" -eq 2 ]
	done

	[ ! -f "${BATS_TEST_TMPDIR}/calls" ]
}

@test "a deploy with no inlet secret says so, and sends no card" {
	box deploy

	[ "$status" -eq 0 ]
	[[ "$output" == *"No JUTTU_BOX_INLET_SECRET in ${repo}/local/box.env, so this deploy sends no card."* ]]
	[ ! -f "${BATS_TEST_TMPDIR}/curl" ]
}

@test "a deploy sends its card as it starts and when it is deployed, both on one key" {
	with_inlet_secret
	local short
	short="$(git -C "${repo}" rev-parse --short=7 origin/main)"

	box deploy

	[ "$status" -eq 0 ]
	[ "$(card_events | wc -l)" -eq 2 ]
	[[ "$(card_events | sed -n 1p)" == *"\"title\": \"Deploy ${short}\", \"line\": \"Deploying\", \"needs_somebody\": false"* ]]
	[[ "$(card_events | sed -n 2p)" == *"\"line\": \"Deployed\", \"needs_somebody\": true"* ]]
	[ "$(card_events | grep -o '"key": "deploy-[^"]*"' | sort -u | wc -l)" -eq 1 ]
	grep -q "http://127.0.0.1:8290/api/inlet/events" "${BATS_TEST_TMPDIR}/curl"
}

@test "the inlet secret goes to curl on its input, never in its arguments" {
	with_inlet_secret

	box deploy

	[ "$(sort -u "${BATS_TEST_TMPDIR}/curl-stdin")" = "Authorization: Bearer 7.made-up-secret" ]
	run ! grep -q "made-up-secret" "${BATS_TEST_TMPDIR}/curl"
}

@test "a failed deploy says where it stopped, and notifies" {
	with_inlet_secret

	DOCKER_EXIT=1 box deploy

	[ "$status" -ne 0 ]
	[[ "$(card_events | tail -1)" == *"\"line\": \"Failed at building and starting\", \"needs_somebody\": true"* ]]
	run ! grep -q '"line": "Deployed"' "${BATS_TEST_TMPDIR}/curl"
}

@test "a ref with nothing to deploy fails at exporting" {
	with_inlet_secret
	git -C "${repo}" rm -q compose.box.yml
	git -C "${repo}" commit -q -m "no compose"

	box deploy HEAD

	[ "$status" -eq 1 ]
	[[ "$(card_events | tail -1)" == *"\"line\": \"Failed at exporting\""* ]]
}

@test "a card Juttu does not take never stops the deploy" {
	with_inlet_secret

	CURL_EXIT=7 box deploy

	[ "$status" -eq 0 ]
	[[ "$output" == *"The deploy card was not updated: Juttu did not take the event."* ]]
	[ "$(cat "${repo}/local/box-deployed")" = "$(git -C "${repo}" rev-parse --short=12 origin/main)" ]
}
