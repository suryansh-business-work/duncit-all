# Duncit Intel

Internal business-intelligence assistant on **intel.duncit.com** (console:
`portals/intel`, settings at `/setting`). Staff sign in with the shared portal
login; roles `INTEL_USER` (Employee), `INTEL_MANAGER` (Admin) and `SUPER_ADMIN`.

**Authorization never depends on the model.** Every request resolves the
caller's Intel level on the server (`access/`), every turn's reach (environments,
sources, connectors) is computed from Settings › Access (`chat/intel.context`),
and every write is only a *proposal* until a permitted person approves it
(`approvals/`, four-eyes on production by default).

## Layers

| Folder | Responsibility |
|---|---|
| `access/` | Level from roles (`intelLevel`), `requireIntel(ctx, level)`, the same for REST routes. |
| `settings/` | One settings document, sections merged over defaults, Zod-validated saves with a revision (no lost updates). `access` and `security` are Super Admin only. |
| `connectors/` | MongoDB, MCP, Slack, Gmail, GitHub drivers (`test` + `sync`). **Credentials are never stored here**: a connector points at a named Tech portal entry (`intel.credentials`, categories `MONGODB`, `MCP_SERVER`, `GMAIL`, `SLACK`, `GITHUB`). |
| `connectors/mongo` | Pooled connections per entry; reads capped (50 rows, 10 s) and redacted; `mongo.safety` refuses code-running operators, write stages, `$lookup` outside permitted collections and filterless updates/deletes. |
| `connectors/mcp` | Streamable-HTTP client, SSRF guard (HTTPS, host allow-list, public DNS only), tool classification READ / WRITE / DESTRUCTIVE (admin override wins), injected tool descriptions withheld. |
| `index/` | Hybrid RAG: chunking (pages / code lines), OpenAI embeddings (`services/openai/openai.embeddings`), IDF-weighted sparse vectors, Qdrant collections per scope (`intel_staging`, `intel_production`, `intel_shared`), RRF fusion, visibility filter, document registry with content hash + version, rebuild. |
| `sync/` | BullMQ queue `intel-sync` (inline fallback without Redis), one lease per connector, incremental cursors saved only on success, prune of upstream deletions on full syncs, reconciliation every 5 min (daily full sync). Runs logged 30 days. |
| `media/` | Uploads in GridFS (private, in the DB backups), MIME sniffed from bytes, PDF text per page, image OCR via the vision model (`intel.ocr` prompt), auto (re)indexing on change, PRIVATE / TEAM / ADMINS visibility. |
| `chat/` | Per-person conversations and messages (every query carries `owner_id`), turn start (guard, rate limits, edit / regenerate), the streaming tool loop (shared bookkeeping in `services/openai/openai.loop`), tools, cited answers, auto titles. Streams over socket.io (`intel:*` events) to the asker's room. |
| `approvals/` | Proposals with preview, forward-only CAS state machine (PENDING → EXECUTING → EXECUTED/FAILED, or REJECTED/EXPIRED), permission re-checked at execution. |
| `audit/` | Immutable, SHA-256-sealed rows for sessions, settings, connectors, syncs, media, tool calls, approvals and production writes; text masked before writing. |
| `health/` | Source cards (never assumed "Connected"), system health, index browser, usage & cost from the shared OpenAI usage log. |

## HTTP routes (`/intel`)

- `POST /intel/media/upload` — multipart, one file (nginx allows 110 MB here).
- `GET /intel/media/:id/file` — bytes, if the caller may see the file.
- `POST /intel/transcribe` — raw audio → `{ text }` (task `intel.transcribe`).
- `POST /intel/webhooks/github/:connectorId` — push webhook, HMAC-verified with the GITHUB entry's `webhook_secret`.

## Prompts and AI features

`intel.system`, `intel.title`, `intel.ocr` in `modules/ai/prompt/catalog/intel.prompts.ts`
(edited in the AI Library). Tasks `intel.chat`, `intel.title`, `intel.embed`,
`intel.ocr`, `intel.transcribe` — each has an AI Features switch and appears in OpenAI Logs.

## Infrastructure

- Qdrant: `qdrant` service in both compose files, internal network only (no host
  port, no vhost), data in `/opt/duncit/qdrant-data` / `/opt/duncit-staging/qdrant-data`.
  The server reads `QDRANT_URL` (set in compose); unset = no index (local dev).
- Console: `intel` service on 2049 (staging 2149); vhosts `intel.duncit.com`,
  `staging.intel.duncit.com`; TLS from the deploy pipeline once DNS resolves.

## Manual setup after the first deploy

1. DNS A records for `intel.duncit.com` and `staging.intel.duncit.com` → the VPS.
2. Tech › Environment: create entries — `MONGODB` (a read-only user per environment;
   a separate least-privilege user if writes are wanted), `MCP_SERVER` (URL + token),
   `GMAIL` (OAuth client + refresh token, `gmail.readonly`), and use/create `SLACK`
   (bot scopes `channels:history`, `groups:history`, `channels:read`, `groups:read`,
   `users:read`) and `GITHUB` (repo read; optional `webhook_secret`).
3. Admin › Portal Access: give people `INTEL_USER` / `INTEL_MANAGER`.
4. Intel › Settings: add connectors (pick the entries by name), test, sync.
