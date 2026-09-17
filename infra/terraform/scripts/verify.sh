#!/usr/bin/env bash
# Runs on the NEW server and proves it serves BEFORE DNS points at it.
#
#   verify.sh prepare   stateful services are expected to be down
#   verify.sh all       everything must be up (cutover)
#
# Env (set by infra/terraform/server):
#   STATEFUL_SERVICES   compose services started only at cutover
set -uo pipefail

MODE="${1:?usage: verify.sh prepare|all}"
STATEFUL_SERVICES="${STATEFUL_SERVICES:?STATEFUL_SERVICES is required}"
failures=0

ok()  { echo "ok    $*"; }
bad() { echo "FAIL  $*"; failures=$((failures + 1)); }

is_skipped() {
  [ "${MODE}" = "prepare" ] && [[ " ${STATEFUL_SERVICES} " == *" $1 "* ]]
}

# A container with a compose healthcheck is judged by it — the server's first
# healthy answer needs its ~3 minute cold boot, hence the long wait.
wait_healthy() {
  local cid="$1" label="$2" status=""
  for _ in $(seq 1 96); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "${cid}")"
    if [ "${status}" = "healthy" ]; then
      ok "${label} healthy"
      return
    fi
    sleep 5
  done
  bad "${label} is ${status} after 8 minutes"
}

# Everything else is judged by an HTTP answer on its published loopback port.
wait_http() {
  local port="$1" label="$2"
  for _ in $(seq 1 12); do
    if curl -fsS -o /dev/null --max-time 10 "http://127.0.0.1:${port}/"; then
      ok "${label} :${port}"
      return
    fi
    sleep 5
  done
  bad "${label} :${port} does not answer"
}

check_service() {
  local stack="$1" svc="$2" cid port
  cid="$(cd "${stack}" && docker compose ps -q "${svc}")"
  if [ -z "${cid}" ]; then
    bad "${stack}/${svc} is not running"
    return
  fi
  if [ -n "$(docker inspect -f '{{if .State.Health}}yes{{end}}' "${cid}")" ]; then
    wait_healthy "${cid}" "${stack}/${svc}"
    return
  fi
  port="$(cd "${stack}" && docker compose config --format json \
    | jq -r --arg s "${svc}" '.services[$s].ports[0].published // empty')"
  if [ -n "${port}" ]; then
    wait_http "${port}" "${stack}/${svc}"
  else
    ok "${stack}/${svc} running (no port, no healthcheck)"
  fi
}

echo ">>> Containers"
for stack in /opt/duncit /opt/duncit-staging; do
  for svc in $(cd "${stack}" && docker compose config --services); do
    is_skipped "${svc}" || check_service "${stack}" "${svc}"
  done
done

echo ">>> Host services"
for unit in docker nginx coturn; do
  if systemctl is-active --quiet "${unit}"; then ok "${unit} active"; else bad "${unit} inactive"; fi
done
if nginx -t 2>/dev/null; then ok "nginx config"; else bad "nginx -t"; fi

# Every hostname on a certificate must complete a TLS handshake through THIS
# nginx. At cutover a 5xx fails too (SonarQube gets a minute to boot first).
echo ">>> HTTPS through this host's nginx"
cert_hosts="$(for cert in /etc/letsencrypt/live/*/cert.pem; do
  openssl x509 -in "${cert}" -noout -ext subjectAltName | grep -o 'DNS:[^,]*' | cut -d: -f2
done | sort -u)"
for host in ${cert_hosts}; do
  code=""
  for _ in $(seq 1 6); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
      --resolve "${host}:443:127.0.0.1" "https://${host}/")" || code="000"
    if [ "${code}" != "000" ] && { [ "${MODE}" = "prepare" ] || [ "${code}" -lt 500 ]; }; then
      break
    fi
    sleep 10
  done
  if [ "${code}" = "000" ]; then
    bad "https://${host} TLS/connection failed"
  elif [ "${MODE}" = "all" ] && [ "${code}" -ge 500 ]; then
    bad "https://${host} answered ${code}"
  else
    ok "https://${host} (${code})"
  fi
done

echo
if [ "${failures}" -gt 0 ]; then
  echo ">>> ${failures} check(s) failed"
  exit 1
fi
echo ">>> All checks passed (${MODE})"
