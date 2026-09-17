#!/usr/bin/env bash
# Prepares a fresh Ubuntu/Debian VPS to run the Duncit stacks: Docker, nginx,
# certbot, coturn, firewall, kernel settings, swap and SSH hardening.
# Idempotent — Terraform re-runs it whenever this file changes.
#
# Env (set by infra/terraform/server):
#   SWAP_SIZE_GB   size of /swapfile to create when the host has no swap (0 = none)
set -euo pipefail

SWAP_SIZE_GB="${SWAP_SIZE_GB:?SWAP_SIZE_GB is required}"
export DEBIAN_FRONTEND=noninteractive
# Ubuntu's needrestart otherwise stops apt to ask which services to restart.
export NEEDRESTART_MODE=a

# coturn's listeners and relay range — the values documented in dev.md
# ("Staff calls: the TURN relay"). The config itself is copied from the old host.
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_RELAY_RANGE=49160:49260

log() { printf '\n>>> %s\n' "$*"; }

log "Base packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg jq rsync git ufw \
  nginx certbot python3-certbot-nginx coturn

# deploy/nginx/* uses the standalone `http2 on;` directive (nginx >= 1.25.1).
# Debian 13 ships 1.26; Ubuntu 24.04 ships 1.24 and would fail `nginx -t`.
NGINX_VERSION="$(nginx -v 2>&1 | sed 's|.*/||')"
if ! dpkg --compare-versions "${NGINX_VERSION}" ge 1.25.1; then
  echo "nginx ${NGINX_VERSION} is too old (need >= 1.25.1) — use a Debian 13 image" >&2
  exit 1
fi

log "Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  . /etc/os-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Bounded container logs: ~70 containers writing json logs fill a disk otherwise.
if [ ! -f /etc/docker/daemon.json ]; then
  install -d /etc/docker
  cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
EOF
  systemctl restart docker
fi
systemctl enable --now docker

log "Kernel settings"
# SonarQube's embedded Elasticsearch refuses to start below this.
echo 'vm.max_map_count=262144' > /etc/sysctl.d/90-duncit.conf
sysctl --system >/dev/null

log "Swap"
if [ "$SWAP_SIZE_GB" -gt 0 ] && [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l "${SWAP_SIZE_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "coturn stays off until its config is copied from the old host"
if ! grep -qE '^\s*listening-ip' /etc/turnserver.conf 2>/dev/null; then
  systemctl disable --now coturn
fi

log "Firewall"
# Every compose port is bound to 127.0.0.1, so only nginx, SSH and the TURN
# relay face the internet.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow "${TURN_PORT}"
ufw allow "${TURN_TLS_PORT}/tcp"
ufw allow "${TURN_RELAY_RANGE}/udp"
ufw --force enable

log "SSH: keys only"
install -d -m 700 /root/.ssh
# 00- so it is read first: sshd keeps the FIRST value it sees, and cloud images
# ship a 50-cloud-init.conf that turns password login back on.
cat > /etc/ssh/sshd_config.d/00-duncit.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

log "Bootstrap done"
