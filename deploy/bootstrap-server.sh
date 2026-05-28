#!/usr/bin/env bash
# Idempotent server bootstrap. Run ONCE on the VPS as root.
# Installs a single consolidated /etc/nginx/sites-available/duncit.com vhost
# (apex + every subdomain). The deploy workflow later overwrites it with the
# repo's deploy/nginx/duncit.com and runs certbot for TLS.
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
IS_DEVELOPMENT=false
NODE_ENV=production
PORT=2001
MONGO_URI=
JWT_SECRET=
SERVER_URL=https://server.duncit.com
GRAPHQL_URL=https://server.duncit.com/graphql
ADMIN_URL=https://admin.duncit.com
MWEB_BASE_URL=https://mweb.duncit.com
PUBLIC_APP_URL=https://mweb.duncit.com
PUBLIC_SITE_URL=https://duncit.com
SUPPORT_EMAIL=support@duncit.com
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
  ads:
    image: ${DOCKERHUB_USERNAME}/duncit-ads:latest
    container_name: duncit-ads
    restart: unless-stopped
    ports: ["127.0.0.1:2006:80"]
  crm:
    image: ${DOCKERHUB_USERNAME}/duncit-crm:latest
    container_name: duncit-crm
    restart: unless-stopped
    ports: ["127.0.0.1:2007:80"]
  track:
    image: ${DOCKERHUB_USERNAME}/duncit-track:latest
    container_name: duncit-track
    restart: unless-stopped
    ports: ["127.0.0.1:2008:80"]
  tech:
    image: ${DOCKERHUB_USERNAME}/duncit-tech:latest
    container_name: duncit-tech
    restart: unless-stopped
    ports: ["127.0.0.1:2009:80"]
  support:
    image: ${DOCKERHUB_USERNAME}/duncit-support:latest
    container_name: duncit-support
    restart: unless-stopped
    ports: ["127.0.0.1:2010:80"]
  website-app:
    image: ${DOCKERHUB_USERNAME}/duncit-website-app:latest
    container_name: duncit-website-app
    restart: unless-stopped
    ports: ["127.0.0.1:2011:80"]
  legal:
    image: ${DOCKERHUB_USERNAME}/duncit-legal:latest
    container_name: duncit-legal
    restart: unless-stopped
    ports: ["127.0.0.1:2012:80"]
  ai:
    image: ${DOCKERHUB_USERNAME}/duncit-ai:latest
    container_name: duncit-ai
    restart: unless-stopped
    ports: ["127.0.0.1:2013:80"]
  products:
    image: ${DOCKERHUB_USERNAME}/duncit-products:latest
    container_name: duncit-products
    restart: unless-stopped
    ports: ["127.0.0.1:2014:80"]
  marketing:
    image: ${DOCKERHUB_USERNAME}/duncit-marketing:latest
    container_name: duncit-marketing
    restart: unless-stopped
    ports: ["127.0.0.1:2015:80"]
EOF

echo "[4/6] Install consolidated nginx vhost (single duncit.com)"
SITES_AVAIL=/etc/nginx/sites-available
SITES_ENABL=/etc/nginx/sites-enabled
mkdir -p "$SITES_AVAIL" "$SITES_ENABL"

# Drop any legacy per-subdomain vhosts so they don't clash with the
# consolidated file's server_name blocks.
for old in server.duncit.com admin.duncit.com mweb.duncit.com ads.duncit.com \
           crm.duncit.com track.duncit.com tech.duncit.com partners.duncit.com \
           partners-app.duncit.com support.duncit.com website.duncit.com \
           legal.duncit.com ai.duncit.com products.duncit.com marketing.duncit.com; do
  rm -f "$SITES_AVAIL/$old" "$SITES_ENABL/$old"
done

CONF="$SITES_AVAIL/duncit.com"
: > "$CONF"

# Basic HTTP proxy block. server.duncit.com gets full CORS later when the
# deploy workflow ships repo deploy/nginx/duncit.com; this is just enough to
# bring nginx up on a fresh box.
append_block() {
  local NAME="$1" UPSTREAM="$2"
  cat >> "$CONF" <<NGINX
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
}

append_block "duncit.com www.duncit.com" 2000
append_block "server.duncit.com" 2001
append_block "admin.duncit.com"  2002
append_block "mweb.duncit.com"   2003
append_block "partners.duncit.com" 2004
append_block "partners-app.duncit.com" 2005
append_block "ads.duncit.com"     2006
append_block "crm.duncit.com"     2007
append_block "track.duncit.com"   2008
append_block "tech.duncit.com"    2009
append_block "support.duncit.com"   2010
append_block "website.duncit.com"   2011
append_block "legal.duncit.com"     2012
append_block "ai.duncit.com"        2013
append_block "products.duncit.com"  2014
append_block "marketing.duncit.com" 2015

ln -sf "$CONF" "$SITES_ENABL/duncit.com"

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
