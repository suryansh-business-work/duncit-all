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

SERVICES=(server admin mweb website partners-website partners-app ads crm track)
PORTS=(2001 2002 2003 2000 2004 2005 2006 2007 2008)

remove_containers_publishing_ports() {
  for port in "${PORTS[@]}"; do
    ids="$(docker ps -aq --filter "publish=${port}" || true)"
    if [ -n "$ids" ]; then
      echo ">>> Removing container(s) still publishing port ${port}: ${ids}"
      docker rm -f $ids || true
    fi
  done
}

wait_for_ports_to_release() {
  for port in "${PORTS[@]}"; do
    for i in {1..30}; do
      if ! ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .; then
        break
      fi
      if [ "$i" -eq 30 ]; then
        echo ">>> Port ${port} is still allocated after cleanup"
        ss -ltnp "sport = :${port}" || true
        docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
        return 1
      fi
      sleep 1
    done
  done
}

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

remove_containers_publishing_ports
wait_for_ports_to_release

echo ">>> Starting services..."
docker compose up -d --remove-orphans --force-recreate

echo ">>> Waiting for containers to become healthy..."
for i in {1..30}; do
  if docker ps --format '{{.Names}} {{.Status}}' | grep -E 'duncit-(server|admin|mweb|website|partners-website|partners-app|ads|crm|track)' | grep -vq 'Restarting\|Created'; then
    break
  fi
  sleep 2
done

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ">>> Pruning unused images..."
docker image prune -f

