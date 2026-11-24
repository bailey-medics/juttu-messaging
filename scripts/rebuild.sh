#!/usr/bin/env bash
# Rebuild the development stack's images from the latest base images, then
# start it again. For when a dependency changed: a new package in
# backend/pyproject.toml or frontend/package.json.
#
#   scripts/rebuild.sh          rebuild every image
#   scripts/rebuild.sh backend  one service's image
#
# The frontend's packages live in a volume seeded from its image, so a
# rebuild drops that volume and the new image seeds it again.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=utils/dev-stack.sh
source scripts/utils/dev-stack.sh

dev_stack build --pull "$@"
dev_stack down

if [ "$#" -eq 0 ] || [[ " $* " == *" frontend "* ]]; then
	docker volume rm --force juttu_frontend_node_modules >/dev/null
fi

dev_stack up --detach --wait

echo
echo "Juttu is at http://localhost:${JUTTU_HTTP_PORT:-8180}"
