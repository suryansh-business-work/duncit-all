#!/usr/bin/env bash
# Runs on the NEW server and starts every Duncit stack from the files the sync
# copied over — the same images and env the old server was running.
#
#   start-stacks.sh prepare   everything EXCEPT the stateful services, so the new
#                             host can be checked while the old one still serves
#   start-stacks.sh all       everything (cutover)
#
# Env (set by infra/terraform/server):
#   STATEFUL_SERVICES   compose services that must never run on two hosts at once
set -euo pipefail

MODE="${1:?usage: start-stacks.sh prepare|all}"
STATEFUL_SERVICES="${STATEFUL_SERVICES:?STATEFUL_SERVICES is required}"

log() { printf '\n>>> %s\n' "$*"; }

# Compose runs from inside each stack directory, so it finds the stack's own
# compose file AND auto-merges an override next to it (SignOz's memory caps).
compose_in() {
  local dir="$1"
  shift
  (cd "${dir}" && docker compose "$@")
}

# services_for <stack dir> — the compose services this mode starts.
services_for() {
  local services
  services="$(compose_in "$1" config --services)"
  if [ "${MODE}" = "prepare" ]; then
    services="$(grep -vxF -f <(tr ' ' '\n' <<<"${STATEFUL_SERVICES}") <<<"${services}" || true)"
  fi
  echo "${services}"
}

log "SignOz (creates signoz-net, which the Duncit servers join)"
compose_in /opt/signoz/deploy/docker up -d

for stack in /opt/duncit /opt/duncit-staging; do
  mapfile -t services < <(services_for "${stack}")
  log "${stack}: ${services[*]}"
  # Every image, stateful ones included, so the cutover does not wait on a pull.
  compose_in "${stack}" pull --quiet
  compose_in "${stack}" up -d "${services[@]}"
done

if [ "${MODE}" = "all" ]; then
  log "SonarQube"
  compose_in /opt/sonarqube up -d
fi

docker ps --format 'table {{.Names}}\t{{.Status}}'
