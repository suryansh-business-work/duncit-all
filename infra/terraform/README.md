# Duncit server migration (Terraform)

Moves the whole Duncit host — production **and** staging stacks, SignOz,
SonarQube, the TURN relay, nginx and TLS — from the current VPS
(`148.135.136.107`, Hostinger) onto a new server. Nothing application-level
changes: the new host runs the same images with the same env files, and the
GitHub deploy pipeline keeps working once `SSH_HOST` points at it.

Three independent stacks, each with its own state, so a DNS change can never
touch a server and a server change can never touch DNS:

| Stack | Creates | Credentials (env vars only) |
| --- | --- | --- |
| `compute/hostinger` | The new VPS (**buys a plan**) + its root SSH key | `HOSTINGER_API_TOKEN` |
| `dns` | The `duncit.com` zone on Cloudflare (Free plan) and every record | `CLOUDFLARE_API_TOKEN` |
| `server` | Atlas access-list entry, host bootstrap, state migration, cutover | `MONGODB_ATLAS_CLIENT_ID`, `MONGODB_ATLAS_CLIENT_SECRET`, `TF_VAR_old_server_password` |

`scripts/` holds the bash that actually runs on the hosts; Terraform uploads
and sequences it.

## What moves, and what does not

| Item | How |
| --- | --- |
| `/opt/duncit`, `/opt/duncit-staging` (compose, `server.env`, `open-wa.env`, app builds, DB backups, WhatsApp sessions) | rsync, twice (live, then final delta at cutover) |
| `/etc/letsencrypt` + the certbot-patched nginx vhosts, `.htpasswd-redis`, SignOz ingestion-key snippet | rsync — HTTPS works on the new host **before** DNS moves |
| coturn (`/etc/turnserver.conf`, `/root/.turn-credentials`, cert copy) | rsync, old IP rewritten to the new one |
| SonarQube (`/opt/sonarqube` + its Postgres/data volumes) | rsync + volume stream at cutover (it is stopped first) — CI's `SONAR_TOKEN` keeps working |
| SignOz (`/opt/signoz`, same version and port edits) | rsync of the directory; **telemetry data starts fresh** |
| Docker Hub login, `authorized_keys` (includes the GitHub Actions deploy key) | copied |
| MongoDB (`/opt/duncit-mongo`: both databases, keyfile, credentials — see `infra/mongo/README.md`) | rsync, twice; stopped on the old host before the final delta, so that copy is exact. Atlas is only a frozen 2026-09-18 fallback now — its access-list entry is no longer needed by the servers |
| Redis | not copied — it is a response cache |
| Other projects sharing the old VPS, root crontab, custom systemd units | **not** copied — review `inventory.txt` (below) |

The cutover is **cold** for the API servers, MongoDB and WhatsApp gateways: two
live servers would fire every scheduler twice (emails, coin expiry,
settlements, backups), a running database cannot be copied consistently, and
one WhatsApp session cannot live in two places. Expect roughly 5–10 minutes of
API downtime.

## Prerequisites

- Terraform ≥ 1.6 (`winget install Hashicorp.Terraform`).
- A dedicated key for the new host: `ssh-keygen -t ed25519 -f ~/.ssh/duncit_vps -C duncit-vps`.
- Hostinger API token (hPanel → Profile → API) and a payment method on the account.
- Cloudflare account + API token with **Zone:Edit** and **DNS:Edit**.
- Atlas service account with Project Owner on the Duncit project, and the project id.
- An inventory of the old host, kept next to this runbook:

  ```bash
  ssh root@148.135.136.107 'bash -s' < infra/terraform/scripts/inventory.sh > inventory.txt
  ```

Secrets are only ever environment variables (PowerShell: `$env:NAME = '…'`).
Each stack has a `terraform.tfvars.example` — copy it to `terraform.tfvars`
(git-ignored). **State files hold the migration key**: they are git-ignored;
keep them on an encrypted disk and delete them after the migration.

## Phase 0 — DNS to Cloudflare (at least 48 h before)

Nothing changes for users: the Cloudflare zone points at the **old** IP.

```bash
cd infra/terraform/dns
terraform init
terraform apply            # target_ip = the OLD server
terraform output name_servers
```

1. Export the GoDaddy zone (DNS → ⋯ → Export zone file) and compare it with
   `terraform output server_hosts` + `records.auto.tfvars`. Add anything
   missing to `records.auto.tfvars` and apply again. A record left out stops
   resolving when Cloudflare takes over.
2. Spot-check against Cloudflare directly:
   `Resolve-DnsName server.duncit.com -Server <one-of-the-name-servers>`.
3. GoDaddy → duncit.com → DNS → Nameservers → *I'll use my own* → the two
   Cloudflare names. (DNSSEC is off today; if it is ever turned on, remove the
   DS record first.)
4. Wait until `terraform apply -refresh-only` shows `zone_status = "active"`,
   then 48 h more for the old delegation to expire everywhere.

Server records have a 60 s TTL, so the cutover and any rollback take about a minute.

## Phase 1 — Create the host

```bash
cd infra/terraform/compute/hostinger
terraform init
terraform apply            # purchases the plan
terraform output -raw server_ip
```

A wrong `plan_id`, city or template fails the plan and prints the valid values.
The template must ship nginx ≥ 1.25.1 (the vhosts use `http2 on;`) — Debian 13.
`bootstrap-host.sh` refuses anything older.

## Phase 2 — Prepare (old server keeps serving)

```bash
cd infra/terraform/server
terraform init
terraform apply            # phase = "prepare"
```

This adds the new IP to Atlas, bootstraps the host (Docker, nginx, certbot,
coturn, ufw, swap, key-only SSH), lets the new host pull the state, starts every
service **except** `server` and `open-wa` (both stacks), and runs
`scripts/verify.sh prepare`.

Check it yourself without touching DNS:

```bash
curl -sI --resolve admin.duncit.com:443:<new-ip> https://admin.duncit.com/
```

To refresh the copy later (e.g. the day of the cutover), bump `sync_round`
and apply again.

## Phase 3 — Cutover

1. **Freeze deploys**: no pushes to `staging` or `main` until step 5. A deploy
   that lands on the old host restarts its API server and runs two.
2. `terraform apply -var phase=cutover` (in `server/`). It stops `server`,
   `open-wa` and SonarQube on the old host, copies the final delta and the
   SonarQube volumes, starts everything on the new host and runs
   `scripts/verify.sh all` (waits up to 8 min for the server's cold boot).
3. `terraform apply -var target_ip=<new-ip>` in `dns/` (and set it in that
   stack's `terraform.tfvars`).
4. TURN relay: update the TURN entry in **both** Tech portals — its URLs carry
   the raw IP. On the new host, `dev.md` → "Wiring it to the application",
   with `turn:<new-ip>:3478` in `URLS`. Then `TURN_HOST=<new-ip> node scripts/stun-probe.mjs`.
5. GitHub → Settings → Secrets and variables → Actions → `SSH_HOST` = new IP.
   Deploys are unfrozen from here; run the deploy workflow once to prove the path.
6. After DNS has moved: `certbot renew --dry-run` on the new host.
7. Any third-party allowlist holding the old IP (MSG91 API IP security, SMTP
   relays, partner webhooks) — update it.

## Phase 4 — Finalize

```bash
terraform apply -var phase=finalize     # in server/
```

Removes the migration key from both hosts. Keep the old server **stopped, not
deleted** for a rollback window (a week), then cancel it, delete its Atlas
access-list entry, and rotate its root password — it was shared in plain text.

Never apply `phase = "prepare"` after a cutover: it would copy the old,
stale state over the live one.

## Rollback (before finalize)

1. `terraform apply -var target_ip=148.135.136.107` in `dns/`.
2. On the old host:
   `(cd /opt/duncit && docker compose start server open-wa)`,
   the same in `/opt/duncit-staging`, and `(cd /opt/sonarqube && docker compose start)`.
3. On the new host: `docker compose stop server open-wa` in both stacks.
4. Put `SSH_HOST` back and restore the TURN entries.

Anything written on the new host in between (uploads, WhatsApp session
changes) stays there — copy it back by hand if it matters.

## Another provider later

Every `compute/<provider>` stack follows one contract: create a Debian 13
host with root SSH for `ssh_public_key_path`, and output `server_ip`. The
`dns` and `server` stacks only consume that IP. To move somewhere else, add a
sibling folder (e.g. `compute/hetzner`) with the same output and run the same
phases with its IP. A server created by hand works too: skip Phase 1 and pass
its IP directly.

## Keeping this current

- New portal/service in the compose files: nothing to do here. Its DNS record
  comes from `deploy/nginx/*` on the next `dns` apply.
- New host-level state (a directory outside `/opt/duncit*`, a file under
  `/etc`, a systemd unit, a firewall port, a stack under `/opt`): add it to
  `scripts/bootstrap-host.sh` (install) or `scripts/sync-from-old.sh` (state)
  in the same change.
- A service that must never run twice: add it to `stateful_services`.
- This folder stays outside `deploy/`: every change under `deploy/**` rebuilds
  every image in the deploy workflow.
