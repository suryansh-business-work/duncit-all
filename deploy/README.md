# Duncit Deploy

## One-time server bootstrap (VPS: 148.135.136.107)

```bash
# from your laptop
ssh root@148.135.136.107 'DOCKERHUB_USERNAME=<dockerhub-user> bash -s' < deploy/bootstrap-server.sh
```

This installs Docker + nginx, writes `/opt/duncit/docker-compose.yml`,
adds nginx site configs for **server.duncit.com**, **admin.duncit.com**,
**mweb.duncit.com**, **duncit.com**, **partners.duncit.com**, and
**partners-app.duncit.com**, then reloads nginx.

GitHub Actions installs/expands the Certbot nginx certificate for
`duncit.com`, `www.duncit.com`, `partners.duncit.com`, and
`partners-app.duncit.com` during deploy.

Edit secrets in `/opt/duncit/server.env` (Mongo URI, JWT_SECRET, etc.)
and run `cd /opt/duncit && docker compose up -d`.

## GitHub Secrets required

| Secret             | Value                                |
| ------------------ | ------------------------------------ |
| `SSH_HOST`         | `148.135.136.107`                    |
| `SSH_USER`         | `root`                               |
| `SSH_PRIVATE_KEY`  | Contents of `~/.ssh/id_ed25519`      |

Docker image push uses DockerHub secrets: `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN`.

## What happens on `git push`

1. `typecheck` job builds every workspace (`tsc -b`).
2. Workspace-specific Docker jobs build and push images to DockerHub:
   - `duncit-server` (Node 20 — runs `node dist/index.js` on :2001)
   - `duncit-admin`  (nginx static — admin SPA)
   - `duncit-mweb`   (nginx static — mobile-web SPA)
   - `duncit-website` (nginx static — public website on :2000)
   - `duncit-partners-website` (nginx static — partners landing on :2004)
   - `duncit-partners-app` (nginx static — partner React app on :2005)
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
