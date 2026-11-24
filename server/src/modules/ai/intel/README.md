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
| `connectors/` | MongoDB, MCP, Slack, Gmail, GitHub drivers (`test` + `sync`). **Credentials are never stored on a connector**; `intel.connectorEntry` resolves them: a named Tech portal entry (`intel.credentials`, categories `MONGODB`, `MCP_SERVER`, `GMAIL`, `SLACK`, `GITHUB`), or a reserved `env_entry_id` (`intel.builtin`) — `server` = this server's own database (its `MONGO_URI`, environment fixed to the server's), `duncit` = this server's own MCP run in-process, `oauth` = a Gmail account connected with Google (`config.account_id`). A new Atlas / self-deployed database typed in the form is tried, then saved as a Tech portal `MONGODB` entry (`mongo.newConnection`). |
| `connectors/gmail` | `gmailAccount.*`: Connect with Google (read-only scope) through the Tech portal's Google OAuth client and Mail Automation's registered callback (`/gmail/oauth/callback`, routed by the signed state's purpose). One connector per mailbox (BOTH); refresh tokens sealed at rest; disconnect deletes the index and revokes the grant. |
| `connectors/mongo` | Pooled connections per entry; reads capped (50 rows, 10 s) and redacted; `mongo.safety` refuses code-running operators, write stages, `$lookup` outside permitted collections and filterless updates/deletes. |
| `connectors/mcp` | `mcp.builtin`: Duncit MCP in-process — tools run as the signed-in person through the MCP pipeline (`runToolCall`, resolver RBAC, MCP activity log), no token or consent; searched per person, WRITE/DESTRUCTIVE still go to Intel approvals (executed as the approver). Remote servers: Streamable-HTTP client, SSRF guard (HTTPS, host allow-list, public DNS only), tool classification READ / WRITE / DESTRUCTIVE (admin override wins), injected tool descriptions withheld. |
| `index/` | Hybrid RAG: chunking (pages / code lines), OpenAI embeddings (`services/openai/openai.embeddings`), IDF-weighted sparse vectors, Qdrant collections per scope (`intel_staging`, `intel_production`, `intel_shared`), RRF fusion, visibility filter, document registry with content hash + version, rebuild. |
| `sync/` | BullMQ queue `intel-sync` (inline fallback without Redis), one lease per connector, incremental cursors saved only on success, prune of upstream deletions on full syncs, reconciliation every 5 min (daily full sync). Runs logged 30 days. |
| `media/` | Uploads in GridFS (private, in the DB backups), MIME sniffed from bytes, PDF text per page, image OCR via the vision model (`intel.ocr` prompt), auto (re)indexing on change, PRIVATE / TEAM / ADMINS visibility. |
| `chat/` | Per-person conversations and messages (every query carries `owner_id`), turn start (guard, rate limits, edit / regenerate), image / PDF attachments (`intel.attachments`: up to 5 Media files the asker may open; images sent to the model as images, PDFs as fenced text within 40k characters), the streaming tool loop (shared bookkeeping in `services/openai/openai.loop`), tools, cited answers, auto titles. Streams over socket.io (`intel:*` events) to the asker's room. |
| `approvals/` | Proposals with preview, forward-only CAS state machine (PENDING → EXECUTING → EXECUTED/FAILED, or REJECTED/EXPIRED), permission re-checked at execution. |
| `audit/` | Immutable, SHA-256-sealed rows for sessions, settings, connectors, syncs, media, tool calls, approvals and production writes; text masked before writing. |
| `health/` | Source cards (never assumed "Connected"; an error carries its reason code, Qdrant failures are logged with the cause), system health, index browser, usage & cost from the shared OpenAI usage log. |

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
2. Tech › Environment: `MONGODB` entries only for databases other than this server's own
   (that one is built in; Atlas / self-deployed ones can also be added from Intel),
   `MCP_SERVER` only for MCP servers other than Duncit's (built in), Google OAuth with the
   `gmail.readonly` scope enabled for Connect with Google, and use/create `SLACK`
   (bot scopes `channels:history`, `groups:history`, `channels:read`, `groups:read`,
   `users:read`) and `GITHUB` (repo read; optional `webhook_secret`).
3. Admin › Portal Access: give people `INTEL_USER` / `INTEL_MANAGER`.
4. Intel › Settings: add connectors (built-in source preselected, or an entry by name), test, sync;
   Gmail › Connect with Google for each mailbox. Staging sets `INTEL_URL` in compose (where
   Google returns the browser); production uses the compiled-in `https://intel.duncit.com`.
