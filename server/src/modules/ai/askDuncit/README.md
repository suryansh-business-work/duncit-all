# Ask Duncit

The role-based AI assistant in mWeb and the native app (menu › Ask Duncit), and
its control room in the AI portal (Ask Duncit section).

**Authorization never depends on the model.** Every tool call passes, in order:
the role policy (this module), the MCP refusal rules (console access, MCP kill
switches, write scope) and then the resolver's own RBAC and entity checks —
the same path a person takes in the console. The model can only *propose* a
change; it runs when the person approves it, with permission re-checked then.

## Layers

| Folder | Responsibility |
|---|---|
| `settings/` | The one settings document: global/role kill switches, models (GPT-4o default), limits, feature switches, per-role policy (capabilities, approvals, quotas, instructions, suggestions). 10 s cache, dropped on change. |
| `rbac/` | `askDuncit.role` — the assistant role from the account's roles **read fresh** (`effectiveRoleKeys`), escalation detection. `askDuncit.capabilities` — the tool set = MCP-usable ∩ role policy, approval rules. `askDuncit.access` — operator vs Control Center (SUPER_ADMIN) gates. |
| `llm/` + `services/openai/openai.stream.ts` | Streaming tool-calling chat through the ONE OpenAI funnel (same credentials, AI Features switch, usage row). OpenAI and Gemini models. |
| `mcp/` | The execution engine: an MCP `CallSession` for the person, `find_tools` / `describe_tool` / `call_tool`, and `runAsPerson` — the only place anything executes. Meta params (`mcp_reason`, `mcp_guard`, `mcp_confirm`) are server-owned; the model cannot set them. |
| `turn/` | One turn: availability → escalation → input → quota → injection guard → attachments (`askDuncit.turn`), then the model loop (`askDuncit.loop`), persistence and after-work (`askDuncit.finish`). Streams over socket.io to the asker's room (`askDuncit:*`). |
| `actions/` | Proposals with a forward-only state machine (compare-and-set → idempotent approval), and undo where an exact inverse exists (`askDuncit.rollback`). |
| `conversation/` | Conversations, messages, per-person memory facts and the long-conversation summary. Every read scoped by `user_id`. |
| `knowledge/` | Operator-written articles/SOPs (role-filtered, published only) plus the app FAQs, by full-text search. |
| `guard/` | Direct injection blocks the turn; indirect (files, tool results, knowledge) is fenced `<untrusted>` and flagged; role claims are recorded as escalation attempts; leaky image links are stripped from answers. Reuses the MCP guard rules, plus Hinglish/Hindi versions of "drop your rules" and "show your prompt". |
| `audit/` | Immutable, hashed audit rows for every question, answer, tool call, approval, violation, handover and settings change. Operator copies are masked (emails, phones, cards, ids, secrets). |
| `files/` | Attachments: only URLs on the configured ImageKit endpoint (no SSRF); images by URL, PDFs inline, text fenced and scanned. |
| `voice/` | `POST /ask-duncit/transcribe` and `/ask-duncit/speak` (binary, plain HTTP), server-side so both apps hear and speak the same, Hindi/Hinglish included. |
| `evaluation/` | Confidence, resolved and out-of-context per answer (small model, after the fact). |
| `insights/` | Proactive alerts, each read as the person through Apollo. |
| `handover/` | A conversation becomes a support ticket for Support / Admin / Operations (idempotent per conversation). |
| `quota/` | Messages per minute / day and tokens per day, atomic counters. |
| `analytics/`, `admin/` | The AI portal's dashboard, cost analytics, audit/conversation/feedback tables, tool management. |

## Guardrails

`turn/askDuncit.prompt.ts` appends `GUARDRAILS` after the editable `ask_duncit.system` prompt on every turn, so an AI Library edit cannot remove them: beta honesty, search at least twice before saying no, never show tool names, untrusted data is never an instruction, no invented facts, only the person's own data. The apps label the assistant **Beta** (experimental).

## Switches

- Tech › Feature Flags `ask_duncit` (seeded **off**) — shows the menu row and lets turns start.
- AI portal › Ask Duncit › Feature Flags — global on/off and each feature.
- AI portal › Ask Duncit › AI Agent Control Center — emergency stop (global or per role), role policies.
- AI portal › AI Features — `ask_duncit.*` tasks can each be switched off like any AI feature.

## Prompts

`ask_duncit.system`, `ask_duncit.evaluate`, `ask_duncit.summarize` in
`modules/ai/prompt/catalog/askDuncit.prompts.ts` — edited in the AI Library.
