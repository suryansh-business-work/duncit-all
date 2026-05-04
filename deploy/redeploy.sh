#!/usr/bin/env bash
# Pull newest images and restart. Run on the VPS (called by GH Actions over SSH).
set -euo pipefail
cd /opt/duncit
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
