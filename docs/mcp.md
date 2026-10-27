# Duncit MCP — connect Claude, ChatGPT and Gemini to Duncit

`mcp.duncit.com` lets an AI app work in Duncit **as you**, with exactly the
consoles and permissions you already have. Everything it does is the same
operation your console would run — the same permission checks, the same pod
history, audit log and notifications — and every call is recorded in the MCP
console's Activity page with who, when, why, the arguments, tokens and cost.

Staging: `staging.mcp.duncit.com` (separate database, separate connections).

## 1. Get access

An admin grants one of these in **Admin → Users → roles**:

| Role | Can |
|---|---|
| `MCP_USER` | Connect AI apps; see own activity, connections and the tool catalog |
| `MCP_MANAGER` | Everything above for everyone, plus **MCP → Settings** |
| `SUPER_ADMIN` | Everything |

The AI can only use tools from consoles you have (e.g. Finance tools need a
finance role). Removing your MCP role ends every connection at its next call.

## 2. Pick a connector URL

| URL | Serves |
|---|---|
| `https://mcp.duncit.com/mcp` | **Gateway** — every console you have, via search + call |
| `https://mcp.duncit.com/<console>/mcp` | Just that console's tools |

Consoles: `admin`, `app` (member features: join a pod, profile…), `partners`,
`pods`, `clubs`, `club-admins`, `regional-club-admin`, `venues`, `hosts`,
`finance`, `employee`, `hr`, `products` (partner brands), `ecomm-portal` (pet
store), `crm`, `onboarding`, `communications`, `marketing`, `analytics`, `logs`,
`tech`, `ai`, `localization`, `legal`, `support`, `website-app`, `challenge`,
`gig-jobs`, `ads`, `mcp`.

The MCP console's **Connect** page lists the ones you can open, with copy buttons.

## 3. Connect your AI app

All apps use OAuth: you are sent to `mcp.duncit.com/connect`, sign in with your
normal console login (password, email code, Google, and your authenticator code
if you set one up), check which app is asking and where it will send you back,
choose **read-only** or **allow changes**, and approve.

**Claude (claude.ai / desktop / mobile)** — Settings → Connectors → *Add custom
connector* → paste the URL → Connect.

**ChatGPT** — Settings → Connectors (Developer mode) → *Create* → paste the URL,
authentication *OAuth* → Connect.

**Claude Code**
```bash
claude mcp add --transport http duncit https://mcp.duncit.com/mcp
# then inside Claude Code: /mcp → duncit → Authenticate
```

**Gemini CLI** — `~/.gemini/settings.json`:
```json
{ "mcpServers": { "duncit": { "httpUrl": "https://mcp.duncit.com/mcp" } } }
```
then `/mcp auth duncit`.

**VS Code** — `.vscode/mcp.json`:
```json
{ "servers": { "duncit": { "type": "http", "url": "https://mcp.duncit.com/mcp" } } }
```

**MCP Inspector** (the official debugging app, for developers):
```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP · URL: https://staging.mcp.duncit.com/pods/mcp · Connect
```
It runs the same sign-in and lets you list and call tools by hand.

If an app's sign-in page says its redirect host is not trusted, an MCP manager
adds that host under **MCP → Settings → Trusted redirect hosts**. (The
Inspector's local callback is on `localhost`, which is trusted by default.)

## 4. What to ask

Ready-made prompts (pick them from the app's prompt / slash menu):

| Prompt | Does |
|---|---|
| `audit_tools` | Which tools exist, which you can use, why the rest are hidden |
| `list_all_tools` | Every tool you can use, by category |
| `audit_pod_timings` | Checks every pod's schedule (end after start, overlaps at a venue, double-booked hosts, back-dated, completed before start; optional min/max duration and overdue completion) |
| `create_pod` | Step by step: club → venue/slot → details → your yes → create → verify history |
| `join_free_pod` | Join a free pod as yourself |
| `my_activity` | Your calls, tools, errors, tokens and cost |
| `run_self_test` | Proves every tool and API operation is valid on the live server |
| `find_tool` | Finds the right tool for a task and explains it |

Or just ask: *"audit which MCP tools exist"*, *"list all tools"*, *"audit all pod
timings for next month"*, *"create a badminton pod in Koramangala on Saturday 6–8pm"*,
*"show my MCP usage this week"*, *"run the MCP self-test"*.

## 5. Safety built in

- **Every change needs a reason** (`mcp_reason`), saved with the call.
- **Risky actions need your yes** — delete, cancel, refund, approve, pay, payout,
  release… refuse to run until the AI passes `mcp_confirm: true` after asking you.
- **Read-only connections** cannot run any tool that changes data.
- **Prompt-injection guard** — arguments that look like injected instructions
  ("ignore previous instructions", chat-template tokens, fake tool-call markup,
  hidden Unicode) are blocked (`mcp_guard: "block"`, the default) or flagged
  (`"warn"`). Results are scanned and flagged, invisible control characters are
  removed, and every result reminds the model that member-written text is data,
  never instructions.
- **Never exposed**: sign-in, OTPs, passwords, tokens, secrets, credentials,
  env vars, signing files, database backup downloads, and the MCP console's own
  consent and settings. `mcp_audit_tools` lists every skipped operation and why.
- **Kill switches** (MCP managers): turn off all write tools, any category, or
  any single tool — effective within seconds, no deploy.
- Tokens: access 1 h, refresh 30 days (rotating; a replayed refresh token or
  authorization code ends the connection). A password reset or account lock ends
  every connection immediately.

## 6. The MCP console (`mcp.duncit.com`)

- **Dashboard** — calls, errors, blocked, people, tokens, estimated cost, latency;
  by day, tool, category, AI app, connector, status (and person, for managers).
- **Activity** — every call: who, when, AI app, connector, tool, reason, status,
  arguments (credentials redacted), duration, tokens, cost, injection flags.
- **Tools** — the whole catalog with parameters and whether you can use each.
- **Connect** — your connector URLs and per-app instructions; also the consent page.
- **Connections** — approved apps; revoke any.
- **Settings** (managers) — write switch, guard default, disabled tools and
  categories, token prices for the cost column, trusted redirect hosts.

Token figures are estimates of what each call put into the model's context
(~4 characters per token); your AI provider's bill is the authority. Set the
provider's per-million prices in Settings for the cost column.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| "Your account does not have MCP access" | Ask an admin for `MCP_USER` |
| A tool is missing | `mcp_whoami` / `mcp_audit_tools` — read-only connection, no console role, or switched off |
| `READ_ONLY_CONNECTION` | Remove the connector and connect again, ticking *Allow changes* |
| `CONFIRMATION_REQUIRED` | The AI must ask you and re-call with `mcp_confirm: true` |
| `INJECTION_SUSPECTED` | The text looked like an injected instruction; if it is really what you want saved, confirm and let the AI retry with `mcp_guard: "warn"` |
| "Token was issued for another connector" | Each console URL is a separate connection; the gateway token works everywhere |
| Redirect host not trusted | MCP manager → Settings → Trusted redirect hosts |

Developers: `server/src/microservices/mcp/README.md`. Built on the official MCP
TypeScript SDK v2 (github.com/modelcontextprotocol); serves protocol revision
2026-07-28 and the 2025-era stateless fallback. `pnpm --filter server mcp:conformance`
runs the official conformance suite.
