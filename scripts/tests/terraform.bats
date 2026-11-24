#!/usr/bin/env bats
# Tests for scripts/terraform.sh, which runs Terraform on the repository's
# GitHub settings. Stand-ins for terraform and gh record what
# scripts/terraform.sh asked of them, so nothing reaches GitHub.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/juttu"
	bin="${BATS_TEST_TMPDIR}/bin"
	tools="${BATS_TEST_TMPDIR}/tools"
	mkdir -p "${repo}/scripts" "${repo}/terraform/github" "${bin}" "${tools}"
	cp "${BATS_TEST_DIRNAME}/../terraform.sh" "${repo}/scripts/terraform.sh"

	# Only the tools scripts/terraform.sh needs, so a gh or terraform installed on
	# this machine is never found in place of a stand-in.
	local tool

	for tool in bash dirname mkdir; do
		ln -s "$(command -v "${tool}")" "${tools}/${tool}"
	done

	cat >"${bin}/terraform" <<'EOF'
#!/usr/bin/env bash
echo "GITHUB_TOKEN=${GITHUB_TOKEN:-} terraform $*" >>"${BATS_TEST_TMPDIR}/calls"
EOF
	chmod +x "${bin}/terraform"

	cat >"${bin}/gh" <<'EOF'
#!/usr/bin/env bash
echo "gh $*" >>"${BATS_TEST_TMPDIR}/calls"
echo "token-from-gh"
EOF
	chmod +x "${bin}/gh"
}

# Runs scripts/terraform.sh with a token set by hand.
terraform_with_token() {
	run env PATH="${bin}:${tools}" GITHUB_TOKEN=set-by-hand "${repo}/scripts/terraform.sh" "$@"
}

# Runs scripts/terraform.sh with no token, so it has to borrow gh's.
terraform_without_token() {
	run env -u GITHUB_TOKEN PATH="${bin}:${tools}" "${repo}/scripts/terraform.sh" "$@"
}

calls() {
	cat "${BATS_TEST_TMPDIR}/calls"
}

@test "with no command it prints its usage and runs nothing" {
	terraform_with_token

	[ "$status" -eq 2 ]
	[[ "$output" == *"Usage: scripts/terraform.sh <command>"* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}

@test "the first run initialises terraform/github, then runs the command" {
	terraform_with_token plan

	[ "$status" -eq 0 ]
	[ "$(calls)" = "GITHUB_TOKEN=set-by-hand terraform -chdir=${repo}/terraform/github init -input=false
GITHUB_TOKEN=set-by-hand terraform -chdir=${repo}/terraform/github plan" ]
}

@test "once initialised it runs only the command, with its arguments" {
	mkdir -p "${repo}/terraform/github/.terraform"

	terraform_with_token apply -auto-approve

	[ "$status" -eq 0 ]
	[ "$(calls)" = "GITHUB_TOKEN=set-by-hand terraform -chdir=${repo}/terraform/github apply -auto-approve" ]
}

@test "init is run once, not twice" {
	terraform_with_token init -upgrade

	[ "$status" -eq 0 ]
	[ "$(calls)" = "GITHUB_TOKEN=set-by-hand terraform -chdir=${repo}/terraform/github init -upgrade" ]
}

@test "without GITHUB_TOKEN it borrows the token gh is signed in with" {
	mkdir -p "${repo}/terraform/github/.terraform"

	terraform_without_token plan

	[ "$status" -eq 0 ]
	[ "$(calls)" = "gh auth token
GITHUB_TOKEN=token-from-gh terraform -chdir=${repo}/terraform/github plan" ]
}

@test "the state directory is made in local/, which git ignores" {
	terraform_with_token plan

	[ "$status" -eq 0 ]
	[ -d "${repo}/local/terraform" ]
}

@test "without terraform it says where to get it" {
	rm "${bin}/terraform"

	terraform_with_token plan

	[ "$status" -eq 1 ]
	[[ "$output" == *"terraform not found"* ]]
}

@test "without GITHUB_TOKEN or gh it refuses" {
	rm "${bin}/gh"

	terraform_without_token plan

	[ "$status" -eq 1 ]
	[[ "$output" == *"Set GITHUB_TOKEN, or sign in with gh"* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}
