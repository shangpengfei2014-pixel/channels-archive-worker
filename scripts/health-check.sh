#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}"

echo "Checking $BASE_URL/health"
curl --fail --silent --show-error \
  --retry 5 --retry-delay 1 --retry-connrefused \
  "$BASE_URL/health"
echo
