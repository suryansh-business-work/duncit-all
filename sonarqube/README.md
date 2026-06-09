# SonarQube — `sonarqube.duncit.com`

Self-hosted [SonarQube Community Build](https://github.com/SonarSource/sonarqube)
for code-quality and security analysis. Runs as its **own** Docker Compose stack
at `/opt/sonarqube` on the VPS — the same pattern as SignOz (`/opt/signoz`). It
is **not** part of `deploy/docker-compose.yml` and is **not** managed by the
GitHub Actions deploy pipeline.

| Piece            | Where it lives                                  |
| ---------------- | ----------------------------------------------- |
| Compose stack    | this folder → `/opt/sonarqube/docker-compose.yml` |
| Reverse proxy    | `deploy/nginx/duncit.com` (`sonarqube.duncit.com` → `127.0.0.1:2023`) |
| TLS certificate  | `.github/workflows/deploy.yml` certbot domain list |
| Status page tile | `status/src/data/services.ts` (Platform group)  |

The proxy + TLS are applied automatically on the next `main` deploy. Only the
**container** has to be started manually on the host (one-time), below.

## One-time deploy on the VPS

```bash
ssh root@148.135.136.107

# 1. Elasticsearch (embedded in SonarQube) requires a high mmap count.
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf

# 2. Drop the compose file in place.
mkdir -p /opt/sonarqube
#    (scp deploy:)  scp sonarqube/docker-compose.yml root@148.135.136.107:/opt/sonarqube/
#    or paste the file manually, then:
cd /opt/sonarqube

# 3. Optional: set a real DB password (defaults to "sonar" otherwise).
echo 'SONAR_DB_PASSWORD=<choose-a-strong-password>' > .env
chmod 600 .env

# 4. Pull the latest image and start.
docker compose pull
docker compose up -d

# 5. Watch it come up (first boot migrates the DB; ~1-2 min).
docker compose logs -f sonarqube   # wait for "SonarQube is operational"
```

Once nginx + certbot have run (next `main` deploy) the UI is reachable at
**https://sonarqube.duncit.com**.

## First login

- User: `admin`
- Password: `admin`

SonarQube **forces a password change** on first login. Set a strong password and
store it in the team password manager.

## Scanning a project

Generate a token in SonarQube (**My Account → Security**), then from any repo:

```bash
docker run --rm -e SONAR_HOST_URL="https://sonarqube.duncit.com" \
  -e SONAR_TOKEN="<token>" \
  -v "$(pwd):/usr/src" sonarsource/sonar-scanner-cli
```

## Operations

```bash
cd /opt/sonarqube
docker compose ps                 # status
docker compose logs -f sonarqube  # logs
docker compose restart sonarqube  # restart
docker compose down               # stop (volumes persist)
docker compose pull && docker compose up -d   # upgrade to newer image
```

Data lives in the named volumes `sonarqube_data`, `sonarqube_extensions`,
`sonarqube_logs`, and `postgresql_data` — they survive `down`/`up`.
