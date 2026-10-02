#!/usr/bin/env bash
# Install an nginx vhost on the host and put its HTTPS listeners back — without
# ever leaving a hostname HTTP-only.
#
# The vhosts in deploy/nginx carry no `listen 443` lines: certbot writes those on
# the host. Installing the repo copy therefore strips HTTPS from every hostname
# in it until `certbot --nginx` patches the listeners back in. When that certbot
# run failed, the deploy used to reload nginx anyway (`|| true`), and every
# hostname fell through to another site's default 443 server. A browser showed a
# foreign certificate; the native app, which cannot click through a TLS error,
# showed "Network error. Check your connection and try again." on its first
# request — a store reviewer's whole experience of the app.
#
# The usual cause is not Let's Encrypt at all but certbot's own lock. Production
# and staging deploy to the SAME host from separate concurrency groups, and two
# certbot runs cannot overlap: the second exits with "Another instance of
# Certbot is already running".
#
# So this script
#   1. takes one host-wide lock, so two deploys never interleave their
#      install → certbot → reload sections;
#   2. waits for certbot's own lock (the renewal timer holds it too) instead of
#      failing on it;
#   3. proves every hostname it asked a certificate for answers with a
#      certificate valid for that name; and
#   4. when that proof fails, restores the vhost that was serving before and
#      fails the deploy — a red deploy with HTTPS intact, never a green one that
#      took it down.
#
# Usage, on the host:
#   configure-nginx-tls.sh <site> <vhost-source> <cert-name> "<core domains>" "<dns-gated domains>"
#
#   core       — hostnames with stable DNS; the certificate must cover them.
#   dns-gated  — newer hostnames, folded in only once their DNS resolves, so a
#                not-yet-created A record cannot fail the all-or-nothing cert.
set -euo pipefail

SITE=$1
SOURCE=$2
CERT_NAME=$3
CORE_DOMAINS=$4
GATED_DOMAINS=$5

SUDO=$(command -v sudo || true)
# Overridable only so the script can be exercised against a scratch directory.
NGINX_ETC=${NGINX_ETC:-/etc/nginx}
AVAILABLE="$NGINX_ETC/sites-available/$SITE"
ENABLED="$NGINX_ETC/sites-enabled/$SITE"
HOST_LOCK=/tmp/duncit-nginx-tls.lock
HOST_LOCK_WAIT_SECONDS=900
CERTBOT_LOCK_ATTEMPTS=30
CERTBOT_LOCK_WAIT_SECONDS=10
CERTBOT_LOCKED='Another instance of Certbot is already running'

reload_nginx() {
  $SUDO nginx -t
  $SUDO systemctl reload nginx
}

# One certbot run for the given hostnames, waiting out certbot's own lock.
#
# ONE run with every hostname that belongs on the certificate: asking for two
# different identifier sets per deploy made every deploy issue two certificates,
# and Let's Encrypt allows five per exact set per 168h. With one stable set, a
# deploy that changes no hostnames asks for the set already on disk and certbot
# issues nothing at all.
run_certbot() {
  local flags=() domain attempt output
  for domain in "$@"; do flags+=(-d "$domain"); done
  for attempt in $(seq 1 "$CERTBOT_LOCK_ATTEMPTS"); do
    if output=$($SUDO certbot --nginx --non-interactive --agree-tos --redirect --expand \
      --cert-name "$CERT_NAME" -m admin@duncit.com "${flags[@]}" 2>&1); then
      echo "$output"
      return 0
    fi
    echo "$output"
    case "$output" in
      *"$CERTBOT_LOCKED"*)
        echo ">>> certbot is locked by another run (attempt $attempt/$CERTBOT_LOCK_ATTEMPTS); retrying in ${CERTBOT_LOCK_WAIT_SECONDS}s"
        sleep "$CERTBOT_LOCK_WAIT_SECONDS"
        ;;
      *) return 1 ;;
    esac
  done
  return 1
}

# True when this host's nginx answers `$1` on 443 with a certificate valid for
# that name. Asked over loopback so it tests nginx, not DNS.
#
# Only curl's connection and TLS exit codes count as a failure: nothing
# listening (7), a failed handshake (35) and the certificate errors (51, 58, 59,
# 60, 77, 83, 90, 91). Everything after the handshake — a 502 from a container
# that is still starting, a slow upstream timing out — is the application's
# business and must not roll a healthy vhost back.
serves_https() {
  local status=0
  curl --silent --show-error --output /dev/null --max-time 10 \
    --resolve "$1:443:127.0.0.1" "https://$1/" || status=$?
  case "$status" in
    7 | 35 | 51 | 58 | 59 | 60 | 77 | 83 | 90 | 91) return 1 ;;
    *) return 0 ;;
  esac
}

# Put back the vhost that was serving before this run, if there was one.
restore_previous() {
  if [ -z "$BACKUP" ]; then
    echo "::error::$SITE has no previous vhost to restore — its hostnames are HTTP-only"
    return
  fi
  $SUDO install -m 644 "$BACKUP" "$AVAILABLE"
  reload_nginx
  echo "::error::HTTPS could not be configured for $SITE; the previous vhost is back in place and still serving"
}

exec 9>"$HOST_LOCK"
if ! flock -w "$HOST_LOCK_WAIT_SECONDS" 9; then
  echo "::error::another deploy held the nginx/TLS lock for ${HOST_LOCK_WAIT_SECONDS}s"
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq certbot python3-certbot-nginx
fi

BACKUP=""
if $SUDO test -f "$AVAILABLE"; then
  BACKUP=$(mktemp)
  $SUDO cat "$AVAILABLE" > "$BACKUP"
fi

$SUDO install -m 644 "$SOURCE" "$AVAILABLE"
$SUDO ln -sf "$AVAILABLE" "$ENABLED"

read -r -a CORE <<< "$CORE_DOMAINS"
ALL=("${CORE[@]}")
for domain in $GATED_DOMAINS; do
  if getent hosts "$domain" >/dev/null 2>&1 || host "$domain" >/dev/null 2>&1; then
    ALL+=("$domain")
  else
    echo ">>> Skipping $domain in certbot (DNS not resolving yet)"
  fi
done

# The full set first. Only when it fails — a brand-new hostname that cannot
# validate yet, or a rate limit — fall back to the core set, so the established
# hostnames keep their HTTPS.
SERVED=()
if [ "${#ALL[@]}" -gt 0 ] && run_certbot "${ALL[@]}"; then
  SERVED=("${ALL[@]}")
elif [ "${#CORE[@]}" -gt 0 ] && [ "${#ALL[@]}" -gt "${#CORE[@]}" ]; then
  echo "::warning::certbot failed for the full domain set; retrying the core set only"
  if run_certbot "${CORE[@]}"; then SERVED=("${CORE[@]}"); fi
fi

if [ "${#SERVED[@]}" -eq 0 ]; then
  restore_previous
  exit 1
fi

reload_nginx

BROKEN=()
for domain in "${SERVED[@]}"; do
  serves_https "$domain" || BROKEN+=("$domain")
done
if [ "${#BROKEN[@]}" -gt 0 ]; then
  echo "::error::no valid certificate served for: ${BROKEN[*]}"
  restore_previous
  exit 1
fi

if [ -n "$BACKUP" ]; then rm -f "$BACKUP"; fi
echo ">>> $SITE: HTTPS verified on ${#SERVED[@]} hostname(s)"
