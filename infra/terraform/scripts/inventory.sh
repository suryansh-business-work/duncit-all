#!/usr/bin/env bash
# Read-only inventory of a Duncit host. It changes nothing and prints no secret
# values — run it on the OLD server before a migration and keep the output next
# to the runbook, so nothing that lives only on that box is forgotten:
#
#   ssh root@<old-server-ip> 'bash -s' < infra/terraform/scripts/inventory.sh > inventory.txt
set -uo pipefail

section() { printf '\n===== %s =====\n' "$1"; }

section "OS and size"
. /etc/os-release && echo "$PRETTY_NAME"
uname -r
echo "vCPU: $(nproc)"
free -h
df -hT -x tmpfs -x overlay -x devtmpfs
swapon --show
sysctl vm.max_map_count vm.swappiness
timedatectl | grep -i 'time zone'

section "Software"
docker --version
docker compose version
nginx -v 2>&1
certbot --version 2>&1
dpkg -s coturn 2>/dev/null | grep -E '^(Status|Version)'

section "Compose projects (Duncit and everything else on this box)"
docker compose ls -a

section "Containers"
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

section "Docker volumes and networks"
docker system df -v | sed -n '/Local Volumes space usage/,/Build cache usage/p'
docker network ls

section "Disk use under /opt"
du -sh /opt/* 2>/dev/null
for stack in /opt/duncit /opt/duncit-staging; do
  echo "--- $stack"
  du -sh "$stack"/* 2>/dev/null
done

section "nginx"
ls -la /etc/nginx/sites-enabled /etc/nginx/conf.d
ls -la /etc/nginx/.htpasswd* /etc/nginx/signoz-otlp-auth*.conf 2>/dev/null

section "Certificates"
certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'
ls -la /etc/letsencrypt/renewal-hooks/deploy 2>/dev/null

section "Listening sockets"
ss -tulpn

section "Firewall"
ufw status verbose 2>/dev/null
iptables -S INPUT 2>/dev/null | head -40

section "Running services and timers"
systemctl list-units --type=service --state=running --no-pager --plain | awk '{print $1}'
systemctl list-timers --all --no-pager

section "Cron"
crontab -l 2>/dev/null
ls -la /etc/cron.d

section "Docker daemon config"
cat /etc/docker/daemon.json 2>/dev/null

section "coturn config (credential lines removed)"
grep -vE '^\s*(#|$)' /etc/turnserver.conf 2>/dev/null | grep -viE 'secret|password|^\s*user='

section "SSH"
sshd -T 2>/dev/null | grep -Ei '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication) '
# Key type and comment only — never the key material.
awk 'NF {print $1, $NF}' /root/.ssh/authorized_keys 2>/dev/null

section "Files in /root (names only)"
ls -la /root
