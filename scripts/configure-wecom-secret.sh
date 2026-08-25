#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$APP_DIR/.wecom-kf.env"
SERVER="${SERVER:?Set SERVER, for example: ubuntu@SERVER_IP}"
REMOTE_FILE="/home/ubuntu/channels-archive-worker/.wecom-kf.env"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE"
  exit 1
fi

read -r -s -p "Paste the rotated WeCom app Secret: " secret
echo
if [[ -z "$secret" ]]; then
  echo "Secret cannot be empty."
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT
awk -v secret="$secret" '
  BEGIN { updated = 0 }
  /^WECOM_APP_SECRET=/ {
    print "WECOM_APP_SECRET=" secret
    updated = 1
    next
  }
  { print }
  END {
    if (!updated) print "WECOM_APP_SECRET=" secret
  }
' "$CONFIG_FILE" > "$tmp_file"
chmod 600 "$tmp_file"
mv "$tmp_file" "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"
trap - EXIT

scp "$CONFIG_FILE" "$SERVER:$REMOTE_FILE"
ssh "$SERVER" \
  "chmod 600 '$REMOTE_FILE' && sudo systemctl restart channels-archive && sleep 1 && curl -fsS --retry 5 --retry-delay 1 --retry-connrefused http://127.0.0.1:3100/health"
echo
echo "WeCom Secret installed without echoing it."
