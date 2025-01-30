#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked

SCRIPT_DIR="$( dirname "$(readlink -f "${BASH_SOURCE[0]}")" )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

cd "$PROJECT_ROOT/src/sui-bulksend"
rm -rf .coverage_map.mvcov .trace build traces

cd "$PROJECT_ROOT/src/cli"
pnpm clean
