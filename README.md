# 🚀 Duncit 

[![Quality Gate Status](https://sonarqube.duncit.com/api/project_badges/measure?project=suryansh-business-work_duncit-all_4f460a81-a423-455b-81e3-8792ab4b2046&metric=alert_status&token=sqb_40009a2dfbfba7c97e338334befafc258e14732d)](https://sonarqube.duncit.com/dashboard?id=suryansh-business-work_duncit-all_4f460a81-a423-455b-81e3-8792ab4b2046)

React + GraphQL + Node.js, one pnpm workspace, ~30 deployed surfaces.

## 🏗️ What lives where

```
duncit-all/
├── app/
│   ├── mweb/            # User-facing mobile web (React + MUI, port 2003)
│   └── mobile-app/      # Native app (Expo + Tamagui) — STANDALONE npm workspace,
│                        #   its own package-lock.json; use npm here, not pnpm
├── server/              # GraphQL API (Apollo v4 + MongoDB, port 2001)
├── portals/             # 17 internal consoles (React + MUI): admin, crm, finance,
│                        #   tech, support, products, onboarding, marketing, legal,
│                        #   ai, ads-portal, partners-app, website-app, hr, employee,
│                        #   challenge-portal, developers
├── website/             # 5 public Astro sites: main, partners, ads, status, earnwith
├── packages/            # 27 shared @duncit/* packages — see `pnpm docs`
├── docs-site/           # Browsable package reference (Astro + MDX + live previews)
├── scripts/             # Repo-wide gates and tooling (all *.mjs, run by CI)
└── .claude/CLAUDE.md    # THE coding standards — read before writing code
```

### Server architecture (`server/src`)

Domain modules under `modules/`, one folder per concern:

```
modules/
├── access/        auth/ (login, signup, forgot/reset password)
│                  profile/  role/  user/  addressBook/  verification/ …
├── clubs/         club, clubAdmin
├── pods/          pod, podMember, category, search, ticket …
├── portals/       the portal login gate + role map (deliberately flat)
├── finance/       money waterfall, payments, settlement
├── crm/ platform/ venues/ support/ engagement/ commerce/ content/ …
```

Cross-cutting: `config/ middleware/ observability/ realtime/ services/ utils/`.
Path aliases (`@modules/*`, `@utils/*`, …) are defined in BOTH `server/tsconfig.json`
and `server/jest.config.js` — change one, change both.

## 🧰 Tech

| Surface | Stack |
|---|---|
| mWeb + 17 portals | React, **MUI**, @mui/icons-material, React Hook Form + **Zod** |
| Native app | Expo, **Tamagui**, @expo/vector-icons, RHF + Zod |
| Websites | **Astro** + Tailwind |
| API | Apollo Server v4, Mongoose, GraphQL Code Generator |
| Dates | date-fns, admin-configured format via `@duncit/app-settings` |
| E2E | **Cypress only** (Playwright was removed repo-wide) |

Rule-of-thumb pair: mWeb and native must behave **identically** (CLAUDE.md rule 27);
share the logic through `@duncit/*` packages, never the UI primitives.

## 📦 Shared packages — check here BEFORE writing a helper

27 packages under `packages/`, each documented with live previews, realistic sample
data and worked examples:

```bash
pnpm docs          # browse at http://localhost:2500
pnpm docs:build    # what CI runs
```

Anything used in more than two places belongs in one of these — see CLAUDE.md
rule 40. The full duplication audit that drove this lives in
[docs/duplication-audit.md](docs/duplication-audit.md).

## 🚀 Getting started

```bash
pnpm install                       # everything except the native app
cd app/mobile-app && npm ci        # the native app (standalone npm)

# server needs Mongo + env
cp server/.env.example server/.env # set MONGO_URI, JWT_SECRET
mongod

pnpm dev:server                    # http://localhost:2001/graphql
pnpm dev:app                       # mWeb  → :2003
pnpm dev:admin                     # admin → :2002  (dev:<portal> for the rest)
pnpm run:all                       # the whole stack
pnpm kill-ports:all                # release every port
```

### Pointing a local portal at a live backend

Every portal (all 17 + mWeb) ships target-specific dev scripts that set
`VITE_GRAPHQL_URL`, so no file editing:

```bash
pnpm --filter tech dev              # → localhost:2001 (needs a local server)
pnpm --filter tech dev:main         # → server.duncit.com          (production API)
pnpm --filter tech dev:staging      # → staging.server.duncit.com  (staging API)
pnpm --filter server dev:staging    # local API on the duncit-staging DB
```

If the API isn't up, every request fails with `net::ERR_CONNECTION_REFUSED` and
login won't work — start the server first.

## ✅ Testing & CI gates — none of these are optional

| Gate | Command | Enforced by |
|---|---|---|
| Unit + coverage | `pnpm --filter <ws> test:coverage` | per-workspace thresholds; `app/mobile-app` and most packages gate at **100/100/100/100** |
| Shared packages | `pnpm --filter "./packages/**" test:coverage` | `shared-gates.yml` — a package missing its own threshold fails the build |
| E2E (Cypress) | `pnpm e2e` in any workspace | `e2e.yml` → the **E2E gate** check; all 53 workspaces declare an `e2e` script (audited), and deploys are blocked behind the gate |
| Fallback icons / i18n keys | `scripts/verify-*.mjs` | `shared-gates.yml` |
| Docs build | `pnpm docs:build` | `shared-gates.yml` (strict MDX frontmatter) |
| SonarQube | scans `staging` and `main` | quality gate: 0 new violations, hotspots 100% reviewed |

E2E rules worth knowing: no `--if-present`, no `paths:` filter, no
`continue-on-error` — a suite that never ran can never look green.

## 🌿 Branch & deploy flow (enforced by hooks)

```
feature branch → staging → PR → main
```

- Pushing `staging` deploys the full replica stack to `https://staging.<sub>.duncit.com`.
- Merging to `main` deploys production. **Never push main directly** (pre-push hook blocks it).
- The pre-commit hook bumps the app version on every commit
  (`app/mobile-app/app.json` is the source of truth).

## ⚡ Redis (GraphQL response cache)

Each stack (prod + staging) runs its own `redis` container (`redis:7-alpine`,
no host port — compose-network only) and the server caches **whole GraphQL
responses** for a whitelist of public, user-independent queries (branding,
settings, translations, website content, FAQs, …). See
`server/src/config/redisResponseCache.ts` for the whitelist and
`server/src/config/redis.ts` for the connection.

- **Wiring**: `REDIS_URL=redis://redis:6379` is written into `server.env` by
  the deploy workflow. Unset (local dev, tests) = caching off, everything still
  works — Redis is a cache, never a dependency (`/health` reports it under
  `checks.redis` without ever flipping the status to degraded).
- **TTL-only invalidation**: `REDIS_CACHE_TTL_SECONDS` (default 60). Admin
  edits to cached data appear within a minute.
- **`?noRedis=true`**: append it to any portal/mWeb URL to bypass the cache for
  that tab (sticky via sessionStorage; `?noRedis=false` clears it). The client
  then sends `x-no-redis: true` and the server answers straight from Mongo.
  The `x-redis-cache` response header reports `hit | miss | bypass`.
- **UI**: <https://redis.duncit.com> (prod) and
  <https://staging.redis.duncit.com> (staging) run Redis Commander, fronted by
  nginx **basic auth**. The credential file lives at
  `/etc/nginx/.htpasswd-redis` on the VPS and is created ONCE by hand (it
  survives deploys but not a server rebuild):

  ```bash
  printf 'duncit:%s\n' "$(openssl passwd -apr1 '<password>')" | sudo tee /etc/nginx/.htpasswd-redis
  ```

  Both vhosts reference that file — if it is missing, `nginx -t` fails and the
  deploy's nginx step breaks, so recreate it before anything else on a new
  host.
- **Infra services**: `redis` and `redis-ui` are external images, not build
  targets — `deploy/redeploy.sh` `up -d`s them on every deploy.

## 📐 Coding standards

They live in [.claude/CLAUDE.md](.claude/CLAUDE.md) and are enforced by SonarQube +
CI, not by review goodwill. The short version: no hardcoded user-facing text
(localization keys first), no duplicate code (rule 40: 2+ places → shared package),
MUI on web / Tamagui on native, RHF + Zod for every form, no `.tsx` over 200 lines,
and every workspace's coverage threshold is a floor — not a target.
