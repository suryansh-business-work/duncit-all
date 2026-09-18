#!/usr/bin/env bash
# Runs on the OLD server at cutover. Stops what must never run on two hosts at
# once: the API servers (schedulers — emails, settlements, coin expiry, backups
# — would all fire twice), the WhatsApp gateways (one session cannot live in
# two places), MongoDB and SonarQube (their data is copied next, and only a
# stopped database copies consistently). The servers stop before MongoDB so no
# write is in flight when it goes.
#
# Containers are STOPPED, not removed. Rollback on this host:
#   (cd /opt/duncit-mongo && docker compose start)
#   (cd /opt/duncit && docker compose start $STATEFUL_SERVICES)
#   (cd /opt/duncit-staging && docker compose start $STATEFUL_SERVICES)
#   (cd /opt/sonarqube && docker compose start)
#
# Env (set by infra/terraform/server):
#   STATEFUL_SERVICES   compose services to stop in each Duncit stack
set -euo pipefail

STATEFUL_SERVICES="${STATEFUL_SERVICES:?STATEFUL_SERVICES is required}"

for stack in /opt/duncit /opt/duncit-staging; do
  echo ">>> ${stack}: stopping ${STATEFUL_SERVICES}"
  # shellcheck disable=SC2086 # a space-separated service list on purpose
  (cd "${stack}" && docker compose stop ${STATEFUL_SERVICES})
done

echo ">>> MongoDB: stopping"
(cd /opt/duncit-mongo && docker compose stop)

echo ">>> SonarQube: stopping"
(cd /opt/sonarqube && docker compose stop)

docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -E 'duncit|sonarqube'
