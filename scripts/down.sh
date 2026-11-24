#!/usr/bin/env bash
# Stop the development stack. The database and the other volumes are kept.
#
#   scripts/down.sh             stop every service
#   scripts/down.sh --volumes   also delete the volumes, the database among them
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=utils/dev-stack.sh
source scripts/utils/dev-stack.sh

dev_stack down "$@"
