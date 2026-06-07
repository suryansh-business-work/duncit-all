# SignOz (self-hosted observability)

SignOz Community Edition runs on the VPS at **https://signoz.duncit.com**, proxied
by nginx to **127.0.0.1:2021**. It is **not** part of the duncit docker-compose
stack or the GitHub deploy pipeline — it runs from its own upstream clone and is
managed manually on the host.

- **Host path:** `/opt/signoz` (clone of <https://github.com/signoz/signoz>)
- **Compose dir:** `/opt/signoz/deploy/docker`
- **UI service:** `signoz` (upstream image, pinned by the upstream `VERSION` env, currently `v0.127.1`)
- **UI port:** container `8080` → host `127.0.0.1:2021` → nginx `signoz.duncit.com`
- **OTLP receivers:** `4317` (gRPC) / `4318` (HTTP), bound to `127.0.0.1` only

This folder holds the Duncit-specific bits:

- [`docker-compose.override.yaml`](./docker-compose.override.yaml) — memory caps so
  SignOz cannot starve the other stacks on this shared 2-vCPU / ~8 GB box. Auto-merged
  by `docker compose up` when copied next to the upstream compose.

## First-time install

```bash
ssh root@148.135.136.107

# 1. Clone upstream (skip if /opt/signoz already exists)
git clone https://github.com/signoz/signoz.git /opt/signoz
cd /opt/signoz/deploy/docker

# 2. Rebind ports to localhost (Compose concatenates `ports`, so this must be a
#    direct edit of the base compose rather than an override).
sed -i 's|- "8080:8080"|- "127.0.0.1:2021:8080"|' docker-compose.yaml
sed -i 's|- "4317:4317"|- "127.0.0.1:4317:4317"|' docker-compose.yaml
sed -i 's|- "4318:4318"|- "127.0.0.1:4318:4318"|' docker-compose.yaml

# 3. Drop in the memory caps (from this repo folder) so Compose auto-merges them.
#    Copy signoz/docker-compose.override.yaml here:
#      scp signoz/docker-compose.override.yaml root@148.135.136.107:/opt/signoz/deploy/docker/

# 4. Start
docker compose up -d

# 5. Verify
curl -fsSI http://127.0.0.1:2021/ | head -1   # expect 200
docker compose ps
docker stats --no-stream | grep signoz
```

nginx `signoz.duncit.com` → `127.0.0.1:2021` lives in `deploy/nginx/duncit.com`
and its TLS cert is issued via the `certbot` domain list in
`.github/workflows/deploy.yml`.

## Update

```bash
cd /opt/signoz && git pull
cd deploy/docker
# re-apply the port sed edits if git pull reset docker-compose.yaml, then:
docker compose pull && docker compose up -d
```

## Stop / remove

```bash
cd /opt/signoz/deploy/docker
docker compose down            # stop, keep volumes (data retained)
docker compose down -v         # stop + delete all telemetry data
```

## Resource note

This box is below SignOz's recommended spec (2 vCPU vs recommended 4+). The
memory caps protect the other services, but ClickHouse can be OOM-killed under
heavy ingestion — watch `docker stats` and `free -h` after enabling, and raise
`clickhouse` `mem_limit` (or move SignOz to a dedicated host) if it restarts.
