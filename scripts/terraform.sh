#!/usr/bin/env bash
# Run Terraform on the repository's GitHub settings, in terraform/github/.
#
# Usage: scripts/terraform.sh <command> [args]
#
#   scripts/terraform.sh plan      show what would change, changing nothing
#   scripts/terraform.sh apply     make the change, after showing it and asking
#   scripts/terraform.sh <command> any other Terraform command, with its arguments
#
# The first run initialises the directory, so it is safe to run on a fresh
# clone. The GitHub provider reads its token from GITHUB_TOKEN; when that is
# unset, the token gh is signed in with is used. Applying needs a token that
# can change the repository's settings: on a fine-grained token,
# Administration write. See docs/terraform.md.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="${root}/terraform/github"

require_terraform() {
	if ! command -v terraform >/dev/null 2>&1; then
		echo "terraform not found. Install it from HashiCorp:" >&2
		echo "  https://developer.hashicorp.com/terraform/install" >&2
		exit 1
	fi
}

# Borrow gh's token when GITHUB_TOKEN is unset.
ensure_github_token() {
	if [ -n "${GITHUB_TOKEN:-}" ]; then
		return
	fi

	if ! command -v gh >/dev/null 2>&1; then
		echo "Set GITHUB_TOKEN, or sign in with gh, so Terraform can reach GitHub." >&2
		exit 1
	fi

	GITHUB_TOKEN="$(gh auth token)"
	export GITHUB_TOKEN
}

main() {
	local command="${1:-}"

	if [ -z "${command}" ]; then
		echo "No command given. Usage: scripts/terraform.sh <command> [args], such as scripts/terraform.sh plan" >&2
		exit 2
	fi

	require_terraform
	ensure_github_token

	# The state lives here, which git ignores. See terraform/github/versions.tf.
	mkdir -p "${root}/local/terraform"

	if [ "${command}" != "init" ] && [ ! -d "${dir}/.terraform" ]; then
		terraform -chdir="${dir}" init -input=false
	fi

	terraform -chdir="${dir}" "$@"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
	main "$@"
fi
