# SignOz — logging & observability

Self-hosted **SignOz** is the central place for Duncit logs (and, later, traces &
metrics). UI: **https://signoz.duncit.com** · runs on the VPS at `127.0.0.1:2021`.

This doc covers how logs get there and how to send them from any app via the
shared **`@duncit/logs`** API.

---

## 1. Architecture

```
 server (Node)  ──OTLP logs──▶ signoz-otel-collector:4318 ──▶ ClickHouse ──▶ SignOz UI
                                        ▲
 mWeb / portals / mobile  ──POST /logs──┘  (server forwards browser/mobile logs)
```

- The **server** ships logs over OTLP directly to the collector on the internal
  `signoz-net` docker network (no public collector exposure).
- **Browser/mobile** apps can't reach the internal collector, so they POST
  structured logs to **`https://server.duncit.com/logs`**, and the server
  forwards them to SignOz. One ingestion path, no public OTLP.
- The collector and pipeline are managed separately — see [`signoz/README.md`](./signoz/README.md)
  (clone at `/opt/signoz`, memory caps, port rebinding).

---

## 2. The global logger — `@duncit/logs`

One API across the whole stack. Signature: **`logs.<app>.<level>(page, component, data?)`**.

```ts
import { logs } from '@duncit/logs';

logs.server.error('checkout', 'PaymentService', { code: 'INTERNAL_SERVER_ERROR', orderId });
logs.mWeb.info('Home', 'PodList', { count: pods.length });
logs.mobileApp.error('Login', 'OtpForm', { reason: 'otp_expired' });
logs.portal.crm.warn('Leads', 'ImportButton', { skipped: 12 });
```

- **apps:** `server`, `mWeb`, `mobileApp`, and `portal.<name>`.
- **levels:** `debug` · `info` · `warn` · `error`.
- **page / component / data** are free-form; `data` is any JSON-able object and
  is stored as filterable `data.*` attributes in SignOz.
- **portal / app names are defined in one place:**
  [`packages/logs/src/config.ts`](./packages/logs/src/config.ts) (`APPS`, `PORTALS`).
  Add a console there and it automatically gets a `logs.portal.<name>` logger.

### Transport
`@duncit/logs` is transport-agnostic; configure it once at app startup:

```ts
// Browser / mobile apps:
import { configureLogs, httpTransport } from '@duncit/logs';
configureLogs(httpTransport('https://server.duncit.com/logs'));
```

The **server** uses its own OTLP-backed logger ([`server/src/observability/log.ts`](./server/src/observability/log.ts))
with the same `logs.server.*` shape, emitting straight to the collector.

---

## 3. Adopting it in an app

### Frontend (vite/astro/RN — mWeb, portals, mobile)
1. Add the dep: `"@duncit/logs": "workspace:*"`.
2. In that app's `Dockerfile`, add to the workspace-manifest copy block:
   `COPY packages/logs/package.json ./packages/logs/` (source comes in via the
   existing `COPY packages ./packages`).
3. At startup (e.g. `main.tsx` / `App.tsx`), once:
   ```ts
   import { configureLogs, httpTransport } from '@duncit/logs';
   configureLogs(httpTransport(`${API_ORIGIN}/logs`)); // API_ORIGIN = https://server.duncit.com
   ```
4. Log from anywhere: `logs.mWeb.error('Home', 'PodCard', { id })` or
   `logs.portal.crm.error('Leads', 'Table', { err })`.

### Server (already wired)
- `server/src/otel.ts` — gated OTLP setup + `console.*` → SignOz bridge.
- `server/src/observability/log.ts` — `logs.server.*` + `ingestRemoteLog`.
- `server/src/index.ts` — Apollo `didEncounterErrors` → `logs.server.error('graphql', …)`
  and the `POST /logs` ingest endpoint for frontends.
- Enabled by `OTEL_EXPORTER_OTLP_ENDPOINT` (set in `deploy/docker-compose.yml`);
  unset locally ⇒ telemetry off, plain console.

---

## 4. Viewing logs in SignOz

1. Sign in at **https://signoz.duncit.com**.
2. **Logs** tab → live tail / search.
3. Useful filters:
   - **Errors first:** `severity_text = ERROR`.
   - By app: attribute `app = server` (or `mWeb`, `mobileApp`, `portal`).
   - By portal: `portal = crm`. By location: `page`, `component`.
   - GraphQL failures: search body `[server] graphql/` or `data.code = INTERNAL_SERVER_ERROR`.
4. Save a view / set an alert on `severity_text = ERROR` for the backend.

---

## 5. What is captured today

- **Server:** every `console.*` (errors at ERROR severity) + every GraphQL error
  (failed queries / `INTERNAL_SERVER_ERROR`) as structured `logs.server.error`.
- **Frontend:** anything sent through `@duncit/logs` once an app configures the
  http transport (adoption is per-app — see §3).

### Roadmap
- Traces (auto-instrument HTTP/Express/GraphQL/Mongo) for request + DB error spans.
- Roll `@duncit/logs` init into each frontend app.
- Optional auth / rate-limit on `POST /logs`.

---

## 6. Ops quick reference

| Thing | Where |
| --- | --- |
| SignOz stack | `/opt/signoz` on the VPS (own compose) |
| UI | `127.0.0.1:2021` → https://signoz.duncit.com |
| OTLP receiver | `signoz-otel-collector:4318` on `signoz-net` |
| Server export endpoint | `OTEL_EXPORTER_OTLP_ENDPOINT` in `deploy/docker-compose.yml` |
| Logs table (ClickHouse) | `signoz_logs.logs_v2` |
| Restart collector | `cd /opt/signoz/deploy/docker && docker compose restart otel-collector` |

> The server joins the **external** `signoz-net`. Don't `docker compose down`
> SignOz without redeploying the duncit server, or the server container will fail
> to start (missing network).
