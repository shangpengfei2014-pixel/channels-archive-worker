#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/channels-archive-worker}"

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env. Review it before external use."
fi

sudo cp "$APP_DIR/deployment/channels-archive.service" \
  /etc/systemd/system/channels-archive.service
sudo cp "$APP_DIR/deployment/nginx.conf" \
  /etc/nginx/sites-available/channels-archive
sudo ln -sfn /etc/nginx/sites-available/channels-archive \
  /etc/nginx/sites-enabled/channels-archive
sudo rm -f /etc/nginx/sites-enabled/default

sudo systemctl daemon-reload
sudo systemctl enable --now channels-archive
sudo systemctl restart channels-archive
sudo nginx -t
sudo systemctl restart nginx

"$APP_DIR/scripts/health-check.sh"
