#!/usr/bin/env bash
# Runs on the NEW server and pulls every piece of Duncit state that lives only
# on the old server. rsync moves only what changed, so the cutover's second run
# is a short delta taken after the stateful services were stopped.
#
# Env (set by infra/terraform/server):
#   OLD_HOST       old server IP
#   NEW_HOST       this server's public IP (coturn binds to it)
#   COPY_VOLUMES   "1" at cutover: also copy SonarQube's docker volumes, which
#                  is only consistent once SonarQube is stopped on the old host
#
# Deliberately NOT copied:
#   - redis-data: a response cache, it warms up again on its own
#   - SignOz's docker volumes: telemetry restarts fresh (history stays on the
#     old host until it is decommissioned; errors/warnings are also in Mongo)
#   - MongoDB: it is Atlas, nothing to move
set -euo pipefail

OLD_HOST="${OLD_HOST:?OLD_HOST is required}"
NEW_HOST="${NEW_HOST:?NEW_HOST is required}"
COPY_VOLUMES="${COPY_VOLUMES:-0}"

KEY=/root/.ssh/duncit_migration
SSH_CMD="ssh -i ${KEY} -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
OLD="root@${OLD_HOST}"
# Throwaway image for streaming volumes; GNU tar keeps numeric owners exact.
TAR_IMAGE=debian:bookworm-slim

log() { printf '\n>>> %s\n' "$*"; }
on_old() { ${SSH_CMD} "${OLD}" "$@"; }

# pull <remote path> <local path> [extra rsync args]
# A path missing on the old host is reported and skipped, never fatal: not every
# host has every optional file (e.g. the SignOz ingestion-key snippet).
pull() {
  local src="$1" dst="$2"
  shift 2
  if ! on_old test -e "${src}"; then
    echo "--- not on old server, skipped: ${src}"
    return 0
  fi
  install -d "$(dirname "${dst}")"
  rsync -aH --delete -e "${SSH_CMD}" "$@" "${OLD}:${src}" "${dst}"
}

# copy_volumes <compose project> — recreate each volume with its compose labels
# (so compose adopts it) and stream its contents across.
copy_volumes() {
  local project="$1" vol labels
  for vol in $(on_old docker volume ls -q --filter "label=com.docker.compose.project=${project}"); do
    log "Volume ${vol}"
    if ! docker volume inspect "${vol}" >/dev/null 2>&1; then
      # Single-quoted for the REMOTE shell, so it never expands $k / $v.
      labels="$(on_old "docker volume inspect --format '{{range \$k, \$v := .Labels}}--label {{\$k}}={{\$v}} {{end}}' ${vol}")"
      # shellcheck disable=SC2086 # labels is a flag list on purpose
      docker volume create ${labels} "${vol}" >/dev/null
    fi
    on_old "docker run --rm -v ${vol}:/from:ro ${TAR_IMAGE} tar --numeric-owner -C /from -cf - ." \
      | docker run --rm -i -v "${vol}:/to" "${TAR_IMAGE}" \
          sh -c 'find /to -mindepth 1 -delete && tar --numeric-owner -C /to -xf -'
  done
}

log "Duncit stack directories (compose, env files, app builds, backups, WhatsApp sessions)"
for stack in duncit duncit-staging; do
  # Container-owned files: keep numeric uids, they have no user on the host.
  pull "/opt/${stack}/" "/opt/${stack}/" --numeric-ids --exclude 'redis-data/'
done

log "SonarQube and SignOz stack directories"
pull /opt/sonarqube/ /opt/sonarqube/ --numeric-ids
pull /opt/signoz/ /opt/signoz/ --numeric-ids

log "TLS certificates (the whole lineage, so HTTPS works before DNS moves)"
pull /etc/letsencrypt/ /etc/letsencrypt/

log "nginx vhosts and their server-only snippets"
for site_file in /opt/duncit/nginx/* /opt/duncit-staging/nginx/*; do
  [ -e "${site_file}" ] || continue
  site="$(basename "${site_file}")"
  # The certbot-patched copy (with its 443 listeners), not the repo copy.
  pull "/etc/nginx/sites-available/${site}" "/etc/nginx/sites-available/${site}"
  ln -sf "/etc/nginx/sites-available/${site}" "/etc/nginx/sites-enabled/${site}"
done
for f in $(on_old 'ls -1 /etc/nginx/.htpasswd-* /etc/nginx/signoz-otlp-auth*.conf 2>/dev/null'); do
  pull "${f}" "${f}"
done
nginx -t
systemctl reload nginx

log "coturn (config, credentials, certificate copy)"
pull /etc/turnserver.conf /etc/turnserver.conf
pull /etc/default/coturn /etc/default/coturn
pull /root/.turn-credentials /root/.turn-credentials
pull /etc/coturn/ /etc/coturn/
# The relay binds to the public IP, so the old address must become the new one.
sed -i "s/${OLD_HOST//./\\.}/${NEW_HOST}/g" /etc/turnserver.conf
if [ -d /etc/coturn ]; then
  # By name, not uid: the turnserver uid differs between hosts.
  chown -R turnserver:turnserver /etc/coturn
fi
systemctl enable coturn
systemctl restart coturn

log "Docker Hub login (private images)"
pull /root/.docker/config.json /root/.docker/config.json

log "Authorized SSH keys (GitHub Actions deploy key included)"
{
  cat /root/.ssh/authorized_keys 2>/dev/null || true
  # `|| true`: grep exits 1 when the migration key is the only line.
  on_old cat /root/.ssh/authorized_keys | grep -v ' duncit-migration$' || true
} | awk 'NF && !seen[$0]++' > /root/.ssh/authorized_keys.new
install -m 600 /root/.ssh/authorized_keys.new /root/.ssh/authorized_keys
rm -f /root/.ssh/authorized_keys.new

if [ "${COPY_VOLUMES}" = "1" ]; then
  log "SonarQube data volumes"
  docker pull -q "${TAR_IMAGE}" >/dev/null
  on_old docker pull -q "${TAR_IMAGE}" >/dev/null
  copy_volumes sonarqube
fi

log "Sync done"
