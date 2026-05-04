# Duncit Deploy

## One-time server bootstrap (VPS: 148.135.136.107)

```bash
# from your laptop
ssh root@148.135.136.107 'GH_OWNER=<your-github-user-or-org> bash -s' < deploy/bootstrap-server.sh
```

This installs Docker + nginx, writes `/opt/duncit/docker-compose.yml`,
adds nginx site configs for **server.duncit.com**, **admin.duncit.com**,
**mweb.duncit.com**, and reloads nginx.

> The existing `duncit.com` website config is **NOT touched**.
> DNS is already pointed (per your note) — no SSL/cert config is written here.
> Add Certbot later if/when you want HTTPS.

Edit secrets in `/opt/duncit/server.env` (Mongo URI, JWT_SECRET, etc.)
and run `cd /opt/duncit && docker compose up -d`.

## GitHub Secrets required

| Secret             | Value                                |
| ------------------ | ------------------------------------ |
| `SSH_HOST`         | `148.135.136.107`                    |
| `SSH_USER`         | `root`                               |
| `SSH_PRIVATE_KEY`  | Contents of `~/.ssh/id_ed25519`      |

GHCR push uses the auto `GITHUB_TOKEN` — no extra secret needed.

## What happens on `git push`

1. `typecheck` job builds every workspace (`tsc -b`).
2. `build-and-push` builds 3 Docker images in parallel and pushes to **ghcr.io**:
   - `duncit-server` (Node 20 — runs `node dist/index.js` on :4000)
   - `duncit-admin`  (nginx static — admin SPA)
   - `duncit-mweb`   (nginx static — mobile-web SPA)
3. `deploy` SSHes to the VPS, runs `/opt/duncit/redeploy.sh` and **loops health checks** (24 retries × 15 s) until every container is responding. Job fails only if it never goes green.

## Local Husky

```bash
npm install      # triggers `husky` install via the prepare script
```

## Manual redeploy on the VPS

```bash
ssh root@148.135.136.107
cd /opt/duncit && ./redeploy.sh
```
