#!/usr/bin/env bash
# Print a Docker Compose project name for this worktree.
#
# Usage: source it, then `project_name <prefix>`, such as
#   project_name juttu-test     # juttu-test-juttu-messaging
#
# Each worktree gets its own name, from its folder, so two worktrees
# running at once never share a container or a volume.

project_name() {
	local prefix="$1"
	local folder

	folder="$(basename "$(pwd -P)" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"

	echo "${prefix}-${folder}"
}
