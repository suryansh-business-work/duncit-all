#!/usr/bin/env bash
# Pull newest images and restart. Run on the VPS (called by GH Actions over SSH).
# Robust against leftover containers / port conflicts:
#   1. Pull latest images.
#   2. Determine which services actually changed.
#   3. For each changed service: stop + rm by name (release the host port),
#      then `up -d` only that service.
#   4. Prune dangling images.
set -euo pipefail
cd /opt/duncit

SERVICES=(server admin mweb)

echo ">>> Pulling images..."
docker compose pull

# Always make sure orphan containers from previous compose names are gone.
docker compose down --remove-orphans --timeout 20 || true

# Belt-and-braces: force-remove by container_name so a stuck container
# (possibly from an aborted previous deploy) doesn't keep the port bound.
for s in "${SERVICES[@]}"; do
  cname="duncit-${s}"
  if docker ps -a --format '{{.Names}}' | grep -qx "$cname"; then
    echo ">>> Removing stale container $cname"
    docker rm -f "$cname" || true
  fi
done

echo ">>> Starting services..."
docker compose up -d --remove-orphans --force-recreate

echo ">>> Waiting for containers to become healthy..."
for i in {1..30}; do
  if docker ps --format '{{.Names}} {{.Status}}' | grep -E 'duncit-(server|admin|mweb)' | grep -vq 'Restarting\|Created'; then
    break
  fi
  sleep 2
done

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ">>> Pruning unused images..."
docker image prune -f

