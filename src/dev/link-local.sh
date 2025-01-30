#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

SCRIPT_DIR="$( dirname "$(readlink -f "${BASH_SOURCE[0]}")" )"
PATH_PROJECT="$( cd "$SCRIPT_DIR/../.." && pwd )"

PATH_SUITCASE="$PATH_PROJECT/../polymedia-suitcase"

cd $PATH_SUITCASE
pnpm build

cd $PATH_PROJECT/src/cli
pnpm link $PATH_SUITCASE/src/core
pnpm link $PATH_SUITCASE/src/node
