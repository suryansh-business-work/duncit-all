# Duncit Lite

The event platform at **lite.duncit.com** (web app) and **lite-portal.duncit.com**
(console). Its own API and its own database; nothing here reads or writes the main
Duncit stack's data. The only bridge is "Sign in with Duncit", which asks the main
API's public sign-in mutations to prove an email — never its database.

| Folder | What it is |
| --- | --- |
| `server/` | Express + Apollo GraphQL API, upload and `.ics` routes, and the HTML server for both hostnames (bundled to `dist-server/index.mjs`) |
| `web/` | The public app (Discover, city and category pages, event pages, registration and UPI payment, tickets, hosting, calendars, profile) |
| `portal/` | The console (dashboard, events, users, registrations, calendars, categories, cities, environment keys, email templates and logs, localization, settings) |
| `shared/` | What both pages share: Apollo client, session, theme, i18n bundles, fallback icons, formatting, and the picture picker (`shared/picture-picker`) |

## Run it locally

```bash
cp lite/.env.example lite/.env          # point LITE_MONGO_URI at a local Mongo
pnpm --filter duncit-lite dev:server     # bundles the server on every change
pnpm --filter duncit-lite start:dev      # runs it on :2040 (in a second terminal)
pnpm --filter duncit-lite dev            # Vite on :2041 — app at localhost:2041, console at portal.localhost:2041
```

The first account whose email is in `LITE_ADMIN_EMAILS` signs in as an admin. With no
mailbox configured the sign-in code is `LITE_OTP_TEST_CODE` (shown on screen); add an
Email (SMTP) entry under Console → Environment to send real codes and notifications.

## Server rendering, PWA and MCP

- Every web page is rendered with React on the server (`web/entry-server.tsx`,
  bundled by `vite.config.ssr.ts` into `dist-server/ssr/`) and hydrated in the
  browser; `server/html/render.ts` falls back to the plain shell on any error.
- The app is an installable PWA (`public/manifest.webmanifest`, `public/sw.js` —
  hashed assets and an offline page only, never personalised HTML).
- mcp.duncit.com/lite/mcp exposes Lite's API as MCP tools. It calls `/graphql`
  with a signed assertion (`server/mcp/`, `LITE_MCP_SECRET`) and reads the
  schema from `GET /mcp/schema`.
- Console → Environment holds Google Maps (browser key: place search, event map),
  MSG91 (phone sign-in codes) and Pexels (stock photos) beside SMTP, ImageKit and
  Google sign-in.

## Pictures

Every cover, calendar picture, avatar and city cover is chosen with `PictureField`
from `shared/picture-picker` — there is no box to paste a link into. Its dialog takes
a drag-and-drop or device upload (POST `/upload`, stored on ImageKit by the server)
or a Pexels stock photo: Featured (curated picks), Previous events (covers of events
the person hosts), a topic, or a search, with a shape filter. A chosen photo is copied
to ImageKit by `liteImportPexelsPhoto`, which takes only the Pexels id, so no
arbitrary link reaches the image store. The topics are Console → Settings → General →
Picture topics; without a Pexels entry the dialog offers uploads and earlier covers.
The web app passes nothing extra; the console passes `tokenKey={STORAGE_KEYS.portalToken}`
so uploads carry its own session.

## How it deploys

`lite/Dockerfile` builds one image (`duncit-lite`) that `deploy/docker-compose*.yml`
runs on :2040 (staging :2140). nginx sends both hostnames to it; the Host header picks
the console shell over the web app. `deploy.yml` renders `lite.env` from the
`LITE_MONGO_URI`, `LITE_JWT_SECRET` and `LITE_ADMIN_EMAILS` secrets (with the main
values as first-deploy fallbacks — the database NAME is always Lite's own) and folds
the two hostnames into the certbot certificate once their DNS resolves.
