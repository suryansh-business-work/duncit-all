#!/usr/bin/env bash
# Pull newest images and restart ONLY the services that were rebuilt this run.
#
# The GH Actions deploy job passes the rebuilt set via `SERVICES` (e.g.
# `SERVICES='admin crm'`). Services not in that list are left alone — their
# containers keep running on whatever image they were on, so a failing test
# gate (which skips its build) never bounces a healthy service.
#
# When `SERVICES` is empty or unset, we exit cleanly: no rebuilds = nothing to
# restart. Old containers continue running.
set -euo pipefail
cd /opt/duncit

ALL_SERVICES=(server admin mweb website partners-website partners-app ads crm finance tech support website-app legal ai products marketing onboarding hr employee status)
declare -A PORT_OF=(
  [server]=2001 [admin]=2002 [mweb]=2003 [website]=2000
  [partners-website]=2004 [partners-app]=2005 [ads]=2006
  [crm]=2007 [finance]=2008 [tech]=2009
  [support]=2010 [website-app]=2011 [legal]=2012
  [ai]=2013 [products]=2014 [marketing]=2015
  [onboarding]=2016 [hr]=2017 [employee]=2018 [status]=2019
)

requested_raw="${SERVICES:-}"
# Accept comma- or whitespace-separated lists. Normalise to whitespace.
requested="$(echo "$requested_raw" | tr ',' ' ')"

# Validate every requested service against the known set so a typo can't
# accidentally rebuild the whole stack.
to_restart=()
for s in $requested; do
  match=""
  for valid in "${ALL_SERVICES[@]}"; do
    if [ "$s" = "$valid" ]; then match="$s"; break; fi
  done
  if [ -z "$match" ]; then
    echo ">>> Unknown service '$s' — ignoring (valid: ${ALL_SERVICES[*]})"
    continue
  fi
  to_restart+=("$match")
done

if [ "${#to_restart[@]}" -eq 0 ]; then
  echo ">>> No services to restart. Leaving running containers untouched:"
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
  exit 0
fi

echo ">>> Restarting only: ${to_restart[*]}"

# Pull just the images we'll restart so an unrelated registry hiccup can't
# cascade into our healthy services.
echo ">>> Pulling images for ${to_restart[*]}..."
docker compose pull "${to_restart[@]}"

# For each changed service: stop + remove the named container (releasing its
# host port), then start fresh. Everything else keeps running.
for s in "${to_restart[@]}"; do
  cname="duncit-${s}"
  port="${PORT_OF[$s]:-}"

  if docker ps -a --format '{{.Names}}' | grep -qx "$cname"; then
    echo ">>> Removing existing $cname"
    docker rm -f "$cname" || true
  fi

  # Belt-and-braces: another container might still be holding the host port
  # (e.g. an aborted previous deploy left an orphan). Free it.
  if [ -n "$port" ]; then
    ids="$(docker ps -aq --filter "publish=${port}" || true)"
    if [ -n "$ids" ]; then
      echo ">>> Removing container(s) still publishing port ${port}: ${ids}"
      docker rm -f $ids || true
    fi
    for i in {1..30}; do
      if ! ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .; then break; fi
      if [ "$i" -eq 30 ]; then
        echo ">>> Port ${port} is still allocated after cleanup"
        ss -ltnp "sport = :${port}" || true
        exit 1
      fi
      sleep 1
    done
  fi

  echo ">>> Starting $s"
  docker compose up -d --no-deps "$s"
done

echo ">>> Waiting for restarted containers to settle..."
for i in {1..30}; do
  names_pattern="$(IFS='|'; echo "${to_restart[*]}")"
  if docker ps --format '{{.Names}} {{.Status}}' \
      | grep -E "duncit-(${names_pattern})" \
      | grep -vq 'Restarting\|Created'; then
    break
  fi
  sleep 2
done

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ">>> Pruning unused images..."
docker image prune -f

