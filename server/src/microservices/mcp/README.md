# Duncit MCP service (`mcp.duncit.com`)

Lets Claude, ChatGPT, Gemini (and Claude Code, Gemini CLI, VS Code…) work in
Duncit **as the signed-in person**, through the Model Context Protocol.

- **One connector per console** — `https://mcp.duncit.com/<portal>/mcp` serves
  only that console's tools (`/pods/mcp`, `/finance/mcp`, `/app/mcp`, …).
- **One gateway** — `https://mcp.duncit.com/mcp` reaches every console the person
  has, through `mcp_search_tools` → `mcp_describe_tool` → `mcp_call_tool`.
- **~2,000 tools** — one per GraphQL Query/Mutation field, plus hand-written
  ones. Every tool runs the same resolver the console runs, so permissions,
  pod history, audit rows and notifications are identical to doing it by hand.

Built on the official MCP TypeScript SDK v2 (github.com/modelcontextprotocol):

| Package | Used for |
|---|---|
| `@modelcontextprotocol/server` | `Server`, `createMcpHandler` — serves the **2026-07-28** protocol revision and falls back to stateless serving for 2025-era clients (today's Claude, ChatGPT, Gemini), from one server factory |
| `@modelcontextprotocol/node` | `toNodeHandler` — mounts the handler on Express |
| `@modelcontextprotocol/express` | `requireBearerAuth`, `getOAuthProtectedResourceMetadataUrl`, `hostHeaderValidation` |
| `@modelcontextprotocol/server-legacy/auth` | `mcpAuthRouter` + `OAuthServerProvider` — the SDK's authorization-server helpers (a frozen, supported copy in v2; the SDK suggests moving to a dedicated OAuth library eventually) |

Two error families matter: the OAuth router throws the legacy package's error
classes (`InvalidGrantError` …), while v2's bearer middleware only accepts v2's
`OAuthError(OAuthErrorCode.InvalidToken)` — anything else answers 500. Hence
`tokenVerifier` beside the provider in `auth/oauth.provider.ts`.

## How a call flows

```
AI client ──POST /pods/mcp (Bearer dmcp_at_…)──▶ http/mcp.router.ts
   │  hostHeaderValidation (only the MCP host)
   │  requireBearerAuth → auth/connections.service.verify (hash lookup,
   │  expiry, revoked, account lock / session seal, MCP role — roles read fresh)
   │  token fits this connector? person can open it? → session on authInfo.extra
   ▼
createMcpHandler → server/mcp.server.ts   (one SDK Server per request, either era)
   │  tools/list  → catalog/visibility.listTools
   │  tools/call  → execute/pipeline.runToolCall
   ▼
execute/pipeline.ts
   resolve tool → refusal check (settings kill switches, write scope, console access)
   → execute/validate (shape, size, unknown params, mcp_reason, mcp_confirm, required)
   → guard/injection scan of arguments (block | warn)
   → GraphQL tool: utils/execute-as-user → apollo.executeOperation as the person
     (rate limiter, GraphQL monitor, resolver RBAC; requestIdentity carries the
     person so change logs name them)
     Curated tool: its own run()
   → strip invisible characters + flag injection signatures in the result
   → usage/usage.recorder (one McpToolCall row + a SigNoz log line)
```

## Folders

| Folder | What |
|---|---|
| `catalog/` | `categories.ts` (every typeDefs module → category; typed against the module list, so a new module must be filed or the server does not compile), `endpoints.ts` (connectors), `build.ts` (field → tool), `denylist.ts`, `sensitivity.ts`, `risk.ts`, `json-schema.ts`, `meta-params.ts`, `visibility.ts`, `console.service.ts` |
| `tools/` | Curated tools (`meta/*`, `pods/*`), `define.ts` (zod → tool), `tool.types.ts` |
| `execute/` | `validate.ts`, `pipeline.ts`, `result.ts` |
| `guard/` | Prompt-injection rules (`patterns.ts`) and scanner (`injection.ts`) |
| `auth/` | OAuth 2.1 server: `oauth.provider.ts` (plugs into the SDK), `consent.service.ts`, `connections.service.ts`, `tokens.ts`, `oauth.models.ts` |
| `usage/` | Activity rows, redaction, dashboard aggregations |
| `settings/` | The MCP Settings document (kill switches, guard default, prices, trusted hosts) |
| `server/` | SDK server factory, instructions, MCP prompts |
| `http/` | The Express router mounted at the app root |
| `graphql/` | The MCP console's API |

## Authentication

OAuth 2.1 with PKCE and dynamic client registration — what Claude, ChatGPT and
Gemini expect from a remote MCP server. Discovery: `/.well-known/oauth-protected-resource[/<k>/mcp]`
→ `/.well-known/oauth-authorization-server` → `/register` → `/authorize` → consent →
`/token`.

- `/authorize` sends the person to **mcp.duncit.com/connect?request=…**. They sign in
  with the normal console login (email/username + password, OTP, Google, and the
  authenticator code if enabled), see the app's name and where it will send them
  back (flagged if that host is not trusted), and choose **read-only** or
  **read & write**.
- Clients are always public (no client secret is stored); codes are single-use
  (a replayed code ends the connection it made); refresh tokens rotate (a replayed
  refresh token ends the connection). Only SHA-256 hashes of codes/tokens are stored.
- Access token: 1 hour. Refresh: 30 days sliding. A password reset, account lock or
  removal of the MCP role ends every connection at the next call.
- Roles: `MCP_USER` (connect apps, see own activity), `MCP_MANAGER` (everyone's
  activity, connections, Settings). `SUPER_ADMIN` passes.
- A connector token works only on its own connector; a gateway token works everywhere.

## Every tool takes

| Param | |
|---|---|
| `mcp_reason` | Why the call is made (3–500 chars). **Required** for anything that writes. Saved in the activity log. |
| `mcp_guard` | `block` (default from Settings) refuses arguments that look like injected instructions; `warn` lets them through and flags them. |
| `mcp_confirm` | Only on destructive / consequential tools (delete, cancel, refund, approve, pay…): must be `true`, after the person agreed. |

## Duncit Lite connector (`/lite/mcp`)

Duncit Lite (lite.duncit.com) is a separate product with its own API, database
and accounts, so its tools are not built from this API's schema:

- `lite/lite.catalog.ts` reads Lite's SDL from `GET <LITE_URL>/mcp/schema` at
  boot and every 10 minutes, and rebuilds the catalog only when it changed — a
  new Lite feature becomes a tool without a deploy here.
- `lite/lite.tools.ts` turns each Lite Query/Mutation field into a tool named
  `lite_<field>` (same denylist, risk, confirm and JSON-schema rules as every
  other tool), listed on the `lite` connector and reachable from the gateway.
  Sign-in, contact proofs, Lite credentials, uploads and page views stay out.
- `lite/lite.client.ts` runs a call against `<LITE_URL>/graphql` with a signed
  one-minute assertion (`lite/lite.assertion.ts`, HS256 over
  `LITE_MCP_SECRET`): the person's verified email, their Duncit id, and the
  connection's read / read-write scope. Lite acts as the Lite account for that
  email — the same proof "Sign in with Duncit" gives — and refuses mutations on
  a read-only assertion itself, independently of the check here.
- The connector is open to every MCP user (like the member app); Lite's own
  resolvers decide what their Lite account may do (admin tools need a Lite admin).
- Off until `LITE_MCP_SECRET` is set on both the API and Lite (deploy.yml reads
  the `LITE_MCP_SECRET` / `STAGING_LITE_MCP_SECRET` repo secrets). The API reaches
  Lite on the stack's network: `LITE_URL=http://lite:2040`.

## Curated tools

`mcp_whoami`, `mcp_list_tools`, `mcp_search_tools`, `mcp_describe_tool`,
`mcp_audit_tools`, `mcp_call_tool` (gateway), `mcp_my_usage`, `mcp_self_test`,
`pods_audit_timings`.

## Prompts (ready-made commands)

`audit_tools`, `list_all_tools`, `audit_pod_timings`, `create_pod`,
`join_free_pod`, `my_activity`, `run_self_test`, `find_tool`.

## Never exposed

Whole modules: sign-in, OTP, captcha, API keys, table API tokens, env vars.
Fields: anything named with password / otp / token / login / signup / secret /
credential / seed / impersonate / base64 / two-factor, TURN credentials, iOS
signing files, DB backup downloads, CI hand-offs, and the MCP console's own
consent and settings mutations. Result selections never include a field whose
name is a credential. `mcp_audit_tools` lists every skipped field with its reason.

## Testing

- Unit and integration suites under `__tests__/` (CI — Sonar "Coverage — server").
  The catalog contract suite checks every one of the ~2,000 tools.
- `pnpm --filter server mcp:conformance` — the official MCP conformance suite
  (`@modelcontextprotocol/conformance`) against the production handler on an
  in-memory database. Also a Server CI job.
- By hand: `npx @modelcontextprotocol/inspector`, transport *Streamable HTTP*,
  URL `https://staging.mcp.duncit.com/pods/mcp` — it walks the same OAuth flow.
- In any connected AI app: the `run_self_test` prompt / `mcp_self_test` tool
  validates every tool and API operation on the live server.

## Config

| Env | Default (prod) | |
|---|---|---|
| `MCP_URL` | `https://mcp.duncit.com` | OAuth issuer + connector URLs |
| `MCP_PORTAL_URL` | `https://mcp.duncit.com` | Where `/connect` lives |
| `MCP_USAGE_RETENTION_DAYS` | `365` | Activity TTL |

Staging sets both URLs to `https://staging.mcp.duncit.com` (deploy/docker-compose.staging.yml).
