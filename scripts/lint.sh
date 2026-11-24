#!/usr/bin/env bash
# Run every check pre-commit enforces, over the whole repository.
#
# Usage: scripts/lint.sh [pre-commit options], or `just lint`. Run it before
# committing. Extra arguments go to pre-commit, so `scripts/lint.sh cspell` runs
# one hook.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x .venv/bin/pre-commit ]; then
	PRE_COMMIT=.venv/bin/pre-commit
elif command -v pre-commit >/dev/null 2>&1; then
	PRE_COMMIT=pre-commit
else
	echo "pre-commit not found. Install it with:" >&2
	echo "  python3 -m venv .venv && .venv/bin/pip install pre-commit" >&2
	exit 1
fi

echo "==> pre-commit"
"$PRE_COMMIT" run --all-files --show-diff-on-failure "$@"

# `--all-files` means every file git knows about: pre-commit asks git for
# the list, so an untracked file is invisible to it. CI never hits this,
# because a checkout has everything tracked, which makes it exactly the
# case where a green local run stops predicting a green CI run. So check
# untracked files explicitly. `--files` rather than `git add -N`, because a
# lint script should not reach into the index.
untracked=()
while IFS= read -r -d '' path; do
	untracked+=("$path")
done < <(git ls-files --others --exclude-standard -z)

if [ ${#untracked[@]} -eq 0 ]; then
	exit 0
fi

echo "==> pre-commit (untracked files, which --all-files does not see)"
printf '    %s\n' "${untracked[@]}"

# pre-commit decides a hook "modified files" by diffing against git, which
# has nothing to say about a file it is not tracking: a formatter rewrites
# an untracked file and the run still reports Passed. Hash each one either
# side, so a rewrite fails the run as it would for a tracked file.
before=()
for path in "${untracked[@]}"; do
	before+=("$(git hash-object -- "$path")")
done

status=0
"$PRE_COMMIT" run --show-diff-on-failure --files "${untracked[@]}" "$@" || status=$?

rewritten=()
for i in "${!untracked[@]}"; do
	if [ "$(git hash-object -- "${untracked[$i]}")" != "${before[$i]}" ]; then
		rewritten+=("${untracked[$i]}")
	fi
done

if [ ${#rewritten[@]} -gt 0 ]; then
	echo >&2
	echo "A hook rewrote these untracked files:" >&2
	printf '    %s\n' "${rewritten[@]}" >&2
	echo "Review the changes, then run this again." >&2
	status=1
fi

exit "$status"
