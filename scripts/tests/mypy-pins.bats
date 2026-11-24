#!/usr/bin/env bats
# Tests that the mypy hook checks the backend against the versions it runs
# on. Each package in the hook's additional_dependencies is pinned, and
# its pin must match backend/poetry.lock. A drift means mypy passes code
# against one version of a library while the app runs on another.
bats_require_minimum_version 1.5.0

setup() {
	root="${BATS_TEST_DIRNAME}/../.."
}

# Print "name==version" for each pin in the mypy hook.
hook_pins() {
	awk '
		/- id: mypy$/ { inside = 1; next }
		inside && /- id: / { inside = 0 }
		inside && /^ *- [A-Za-z0-9_.-]+==/ { sub(/^ *- /, ""); print }
	' "$1"
}

# Print the locked version of one package.
locked_version() {
	awk -v name="$1" '
		$0 == "[[package]]" { found = 0 }
		$0 == "name = \"" name "\"" { found = 1; next }
		found && /^version = / { gsub(/"/, "", $3); print $3; exit }
	' "$2"
}

@test "the mypy hook pins at least one package" {
	run hook_pins "${root}/.pre-commit-config.yaml"

	[ "$status" -eq 0 ]
	[ -n "$output" ]
}

@test "every package the mypy hook pins matches backend/poetry.lock" {
	local pin name version locked
	local mismatched=()

	while IFS= read -r pin; do
		name="${pin%%==*}"
		version="${pin#*==}"
		locked="$(locked_version "${name}" "${root}/backend/poetry.lock")"

		if [ "${locked}" != "${version}" ]; then
			mismatched+=("${name}: hook ${version}, lock ${locked:-missing}")
		fi
	done < <(hook_pins "${root}/.pre-commit-config.yaml")

	if [ ${#mismatched[@]} -gt 0 ]; then
		printf '%s\n' "${mismatched[@]}"
		return 1
	fi
}

@test "a pin that drifts from the lock is caught" {
	local config="${BATS_TEST_TMPDIR}/config.yaml"

	sed 's/- django==.*/- django==0.0.1/' "${root}/.pre-commit-config.yaml" >"${config}"

	run hook_pins "${config}"

	[[ "$output" == *"django==0.0.1"* ]]
	[ "$(locked_version django "${root}/backend/poetry.lock")" != "0.0.1" ]
}
