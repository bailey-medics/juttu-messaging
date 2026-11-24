#!/usr/bin/env bash
# Start the development stack, and wait until every service is healthy.
# Ported from Turva's s/up.
#
#   scripts/up.sh               start everything, in the background
#   scripts/up.sh --build       rebuild the images first
#   scripts/up.sh backend       one service and what it depends on
#
# Juttu is then at http://localhost:8180, through Caddy. JUTTU_HTTP_PORT
# and the other variables in .env.example move each port.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=utils/dev-stack.sh
source scripts/utils/dev-stack.sh

dev_stack up --detach --wait "$@"

echo
echo "Juttu is at http://localhost:${JUTTU_HTTP_PORT:-8180}"
echo "Stop it with: scripts/down.sh"
