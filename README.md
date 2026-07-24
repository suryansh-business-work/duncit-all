# 🚀 Duncit — Full Stack Monorepo (React + GraphQL + Node.js)

## 📌 Overview

Full-stack monorepo using pnpm workspaces:

- **web-ui/app** — User-facing React + Vite app
- **web-ui/admin** — Admin React + Vite dashboard
- **server** — Node.js + TypeScript GraphQL API (Apollo Server v4) backed by MongoDB

Cross-cutting:

- **GraphQL Code Generator** for shared types & React hooks
- **Yup** for validation (frontend + backend)
- **MJML** for transactional email templates
- **JWT** for authentication

## 🏗️ Project Structure

```
duncit/
├── web-ui/
│   ├── app/        # User app (Vite, port 5173)
│   └── admin/      # Admin app (Vite, port 5174)
├── server/         # GraphQL API (port 2001)
│   └── src/
│       ├── modules/<name>/
│       │   ├── <name>.schema.ts
│       │   ├── <name>.resolver.ts
│       │   ├── <name>.service.ts
│       │   ├── <name>.model.ts
│       │   └── <name>.validator.ts
│       └── services/email/templates/*.mjml
├── package.json    # workspaces root
└── tsconfig.base.json
```

## 🚀 Getting Started

### 1. Install dependencies (from repo root)

```bash
pnpm install
```

### 2. Configure server env

Copy `server/.env.example` → `server/.env` and edit:

```
PORT=2001
MONGO_URI=mongodb://localhost:27017/duncit
JWT_SECRET=your-secret
```

### 3. Start MongoDB

```bash
mongod
```

### 4. Run the stack

In separate terminals:

```bash
# server  → http://localhost:2001/graphql
pnpm dev:server

# user app → http://localhost:2003
pnpm dev:app

# admin app → http://localhost:2002
pnpm dev:admin
```

To run every project at once:

```bash
pnpm run:all
```

To release all local project ports:

```bash
pnpm kill-ports:all
```

### 5. Choosing which backend a portal talks to

A locally-running portal (`pnpm dev` / `pnpm dev:<portal>`) targets **`http://localhost:2001/graphql`** by
default, so it needs a local server running (steps 2–4). If the API isn't up you'll see every GraphQL request
fail with `net::ERR_CONNECTION_REFUSED` and login won't work.

Every portal (all 17 + mWeb) also ships target-specific dev scripts — the web equivalent of the mobile app's
`start:local` / `start:main` / `start:staging`. They set `VITE_GRAPHQL_URL` (via `cross-env`) so you can point a
local portal at a live or local API without editing any file:

```bash
# from a portal, e.g. tech
pnpm --filter tech dev            # default → http://localhost:2001/graphql  (needs a local server)
pnpm --filter tech dev:main       # → https://server.duncit.com/graphql          (production API + DB)
pnpm --filter tech dev:staging    # → https://staging.server.duncit.com/graphql  (staging API + DB)
pnpm --filter tech dev:local:main    # → http://localhost:2001/graphql, pair with server `dev:main`
pnpm --filter tech dev:local:staging # → http://localhost:2001/graphql, pair with server `dev:staging`
```

The local server chooses its **database** the same way (default = main; `duncit-staging` for staging):

```bash
pnpm --filter server dev          # main database (URI default)
pnpm --filter server dev:main     # main database (explicit alias)
pnpm --filter server dev:staging  # MONGO_DB_NAME=duncit-staging
```

| Portal script         | GraphQL endpoint                            | Pair the server with       | Data source          |
| --------------------- | ------------------------------------------- | -------------------------- | -------------------- |
| `dev`                 | `http://localhost:2001/graphql`             | `dev` / `dev:main`         | your local server    |
| `dev:main`            | `https://server.duncit.com/graphql`         | — (remote)                 | **production DB**    |
| `dev:staging`         | `https://staging.server.duncit.com/graphql` | — (remote)                 | staging DB           |
| `dev:local:main`      | `http://localhost:2001/graphql`             | `pnpm --filter server dev:main`    | local server, main DB    |
| `dev:local:staging`   | `http://localhost:2001/graphql`             | `pnpm --filter server dev:staging` | local server, `duncit-staging` |

> **Which do I want?** To log in with an existing account (e.g. an admin/partner that already exists), the
> quickest path is `dev:main` — it uses the production API + DB, no local server required. The `dev:local:*`
> modes need `server/.env` populated with a valid `MONGO_URI` and a running local server.
>
> **Mobile app** (`app/mobile-app`, npm) has the same switch: `npm run start:local | start:main | start:staging`.

## 🔄 GraphQL Codegen

```bash
pnpm codegen
```

Generates:

- `server/src/generated/graphql.ts` — backend resolver types
- `web-ui/app/src/generated/graphql.ts` — frontend hooks
- `web-ui/admin/src/generated/graphql.ts` — admin frontend hooks

> Add `.graphql` operation files inside each frontend's `src/` (e.g. `src/graphql/auth.graphql`) before running codegen to populate hooks.

## 🔁 Development Flow

```
UI (App/Admin)
   ↓ GraphQL Query/Mutation
Resolver
   ↓ Yup validation
Service Layer
   ↓
MongoDB / Email
```

## 📦 Module Structure (Backend)

Each feature lives under `server/src/modules/<name>/`:

| File | Responsibility |
|------|----------------|
| `*.schema.ts` | GraphQL SDL types |
| `*.resolver.ts` | Apollo resolvers (thin) |
| `*.service.ts` | Business logic |
| `*.model.ts` | Mongoose model |
| `*.validator.ts` | Yup input schemas |

## 📧 Email Templates (MJML)

Location: `server/src/services/email/templates/`

Use `sendEmail({ to, subject, template, vars })` from `server/src/services/email/email.service.ts`. In dev (no `SMTP_HOST`), nodemailer uses a JSON transport that just logs.

## 🛡️ Best Practices

- Keep business logic in services; resolvers stay thin
- Always validate at the GraphQL boundary (Yup)
- Re-run `pnpm codegen` after schema changes
- Reuse Yup schemas in frontend forms

## 📦 Scripts

Root:

```bash
pnpm dev:server      # start API
pnpm dev:app         # start user app
pnpm dev:admin       # start admin app
pnpm dev:website     # start website
pnpm dev:partners-app
pnpm dev:partners-website
pnpm run:all         # start all projects
pnpm kill-ports:all  # release all project ports
pnpm build           # build all workspaces
pnpm codegen         # generate GraphQL types
```

Per-portal backend targeting (any of the 17 portals + mWeb — see [§5](#5-choosing-which-backend-a-portal-talks-to)):

```bash
pnpm --filter <portal> dev              # localhost:2001 (default)
pnpm --filter <portal> dev:main         # server.duncit.com          (production)
pnpm --filter <portal> dev:staging      # staging.server.duncit.com  (staging)
pnpm --filter <portal> dev:local:main   # localhost:2001, + server dev:main
pnpm --filter <portal> dev:local:staging# localhost:2001, + server dev:staging
pnpm --filter server   dev:staging      # local API on the duncit-staging DB
```

## 🔮 Future Improvements

- JWT refresh tokens
- Redis caching
- Docker Compose
- CI/CD pipeline
- Full RBAC

## 💡 Tip

If something breaks: check the GraphQL schema, re-run codegen, verify env variables.
