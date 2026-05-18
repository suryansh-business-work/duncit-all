#!/usr/bin/env bash
# Idempotent server bootstrap. Run ONCE on the VPS as root.
# Does NOT touch existing duncit.com (website) site config.
#
#   ssh root@148.135.136.107 'DOCKERHUB_USERNAME=<u> bash -s' < deploy/bootstrap-server.sh
#
set -euo pipefail

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME env}"

echo "[1/6] apt update + install docker, nginx, jq"
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release nginx jq gettext-base

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker

echo "[2/6] Create /opt/duncit"
mkdir -p /opt/duncit
[ -f /opt/duncit/server.env ] || cat > /opt/duncit/server.env <<'EOF'
NODE_ENV=production
PORT=2001
MONGO_URI=
JWT_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
OPENAI_API_KEY=
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
PEXELS_API_KEY=
EOF
chmod 600 /opt/duncit/server.env

echo "[3/6] Write docker-compose.yml"
cat > /opt/duncit/docker-compose.yml <<EOF
name: duncit
services:
  server:
    image: ${DOCKERHUB_USERNAME}/duncit-server:latest
    container_name: duncit-server
    restart: unless-stopped
    env_file: [/opt/duncit/server.env]
    ports: ["127.0.0.1:2001:2001"]
  admin:
    image: ${DOCKERHUB_USERNAME}/duncit-admin:latest
    container_name: duncit-admin
    restart: unless-stopped
    ports: ["127.0.0.1:2002:80"]
  mweb:
    image: ${DOCKERHUB_USERNAME}/duncit-mweb:latest
    container_name: duncit-mweb
    restart: unless-stopped
    ports: ["127.0.0.1:2003:80"]
  website:
    image: ${DOCKERHUB_USERNAME}/duncit-website:latest
    container_name: duncit-website
    restart: unless-stopped
    ports: ["127.0.0.1:2000:80"]
  partners-website:
    image: ${DOCKERHUB_USERNAME}/duncit-partners-website:latest
    container_name: duncit-partners-website
    restart: unless-stopped
    ports: ["127.0.0.1:2004:80"]
  partners-app:
    image: ${DOCKERHUB_USERNAME}/duncit-partners-app:latest
    container_name: duncit-partners-app
    restart: unless-stopped
    ports: ["127.0.0.1:2005:80"]
EOF

echo "[4/6] Install nginx site configs (skipping existing duncit.com)"
SITES_AVAIL=/etc/nginx/sites-available
SITES_ENABL=/etc/nginx/sites-enabled
mkdir -p "$SITES_AVAIL" "$SITES_ENABL"

write_site() {
  local NAME="$1" UPSTREAM="$2"
  cat > "$SITES_AVAIL/$NAME" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $NAME;
    client_max_body_size 25m;
    location / {
        proxy_pass         http://127.0.0.1:$UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}
NGINX
  ln -sf "$SITES_AVAIL/$NAME" "$SITES_ENABL/$NAME"
}

write_site "server.duncit.com" 2001
write_site "admin.duncit.com"  2002
write_site "mweb.duncit.com"   2003
write_site "duncit.com"        2000
write_site "partners.duncit.com" 2004
write_site "partners-app.duncit.com" 2005
# Also alias www -> apex
sed -i 's/server_name duncit.com;/server_name duncit.com www.duncit.com;/' "$SITES_AVAIL/duncit.com" || true

echo "[5/6] nginx -t && reload"
nginx -t
systemctl reload nginx

echo "[6/6] docker login (if creds present) + initial pull"
if [ -n "${DOCKERHUB_USERNAME:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
fi
cd /opt/duncit
docker compose pull || true
docker compose up -d || true

echo "Bootstrap complete."
