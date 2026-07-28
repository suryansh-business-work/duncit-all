# 🚀 Duncit — Full Stack Monorepo

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

## 📐 Coding standards

They live in [.claude/CLAUDE.md](.claude/CLAUDE.md) and are enforced by SonarQube +
CI, not by review goodwill. The short version: no hardcoded user-facing text
(localization keys first), no duplicate code (rule 40: 2+ places → shared package),
MUI on web / Tamagui on native, RHF + Zod for every form, no `.tsx` over 200 lines,
and every workspace's coverage threshold is a floor — not a target.
