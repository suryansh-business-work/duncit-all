import { categoryLabel } from '@microservices/mcp/catalog/categories';
import { META_PARAMS } from '@microservices/mcp/mcp.constants';
import { exampleArguments, scoreTool } from '@microservices/mcp/tools/meta/catalog.tools';
import { summaryOf } from '@microservices/mcp/tools/meta/shared';
import type { McpTool } from '@microservices/mcp/tools/tool.types';
import { HARD_LIMITS } from '../askDuncit.constants';
import { askDuncitActions } from '../actions/askDuncit.actions';
import { recordAudit } from '../audit/askDuncitAudit.service';
import type { MessageToolCall } from '../conversation/askDuncitMessage.model';
import { flagIds, fenceUntrusted, inspectUntrusted } from '../guard/askDuncit.guard';
import type { TurnContext } from '../turn/askDuncit.context';
import { runAsPerson, stripMetaParams } from './askDuncit.run';

/**
 * The assistant's three gateway tools — find_tools, describe_tool, call_tool —
 * over the person's capability set (rbac/askDuncit.capabilities.ts). Like the
 * MCP gateway, so two thousand tools never have to fit in one prompt.
 *
 * Every answer is JSON the model reads back. Tool RESULTS are fenced as
 * untrusted data and scanned; a flagged result is recorded for operators.
 */

export interface EngineIds {
  conversationId: string;
  messageId: string;
}

export interface EngineResult {
  content: string;
  call?: MessageToolCall;
}

const json = (value: unknown) => JSON.stringify(value);
const DENIED = new Set(['FORBIDDEN', 'UNAUTHENTICATED', 'NO_PORTAL_ACCESS', 'DISABLED', 'READ_ONLY_CONNECTION', 'WRITES_DISABLED']);
/** The values were refused (or the pace was): the model must go back to the person, not retry. */
const INVALID_CODES = new Set(['INVALID_ARGUMENTS', 'VALIDATION_FAILED', 'BAD_USER_INPUT', 'RATE_LIMITED']);

const toolRow = (tool: McpTool, ctx: TurnContext) => ({
  name: tool.name,
  title: tool.title,
  area: categoryLabel(tool.category),
  changes_data: tool.risk !== 'READ',
  needs_approval: ctx.caps.requiresApproval(tool),
  summary: summaryOf(tool.description),
});

/** The tool's parameters without the server-owned meta parameters. */
export function modelParameters(tool: McpTool) {
  const schema = tool.inputSchema;
  const meta = META_PARAMS as readonly string[];
  const properties = Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([key]) => !meta.includes(key)));
  const required = (schema.required ?? []).filter((key) => !meta.includes(key));
  return { type: 'object', properties, required };
}

export function findTools(ctx: TurnContext, query: unknown, limit: unknown): EngineResult {
  const text = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  const max = Math.min(Math.max(Number(limit) || 8, 1), HARD_LIMITS.maxFoundTools);
  if (text.length < 2) return { content: json({ error: 'Say in a few words what you want to do.' }) };
  const results = ctx.caps.tools
    .map((tool) => ({ tool, score: scoreTool(tool, text) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, max);
  return {
    content: json({
      query: text,
      results: results.map(({ tool }) => toolRow(tool, ctx)),
      note: results.length ? undefined : 'Nothing matched. Try other words, or this is not something you can do here.',
    }),
  };
}

async function unauthorized(ctx: TurnContext, ids: EngineIds, name: string): Promise<EngineResult> {
  await recordAudit({
    type: 'VIOLATION',
    violation_kind: 'UNAUTHORIZED_TOOL',
    status: 'DENIED',
    actor: ctx.actor,
    conversation_id: ids.conversationId,
    message_id: ids.messageId,
    tool: name,
    reason: 'The assistant named a tool outside this role’s capabilities',
  });
  return {
    content: json({ status: 'denied', message: 'That is not available for this person’s role. Do not try another way.' }),
    call: { name, title: name, risk: 'UNKNOWN', status: 'DENIED', duration_ms: 0, error_code: 'UNAUTHORIZED_TOOL', action_id: null },
  };
}

export async function describeTool(ctx: TurnContext, ids: EngineIds, name: unknown): Promise<EngineResult> {
  const tool = typeof name === 'string' ? ctx.caps.byName.get(name) : undefined;
  if (!tool) return unauthorized(ctx, ids, String(name ?? ''));
  return {
    content: json({
      ...toolRow(tool, ctx),
      description: tool.description,
      parameters: modelParameters(tool),
      example_arguments: stripMetaParams(exampleArguments(tool.inputSchema)),
    }),
  };
}

const truncate = (text: string) =>
  text.length > HARD_LIMITS.maxToolResultChars ? `${text.slice(0, HARD_LIMITS.maxToolResultChars)}… (cut — ask for a narrower page)` : text;

export async function callTool(ctx: TurnContext, ids: EngineIds, name: unknown, rawArgs: unknown, reason: unknown): Promise<EngineResult> {
  const tool = typeof name === 'string' ? ctx.caps.byName.get(name) : undefined;
  if (!tool) return unauthorized(ctx, ids, String(name ?? ''));
  const args = stripMetaParams(rawArgs);
  const base = { name: tool.name, title: tool.title, risk: tool.risk };

  if (ctx.caps.requiresApproval(tool)) {
    const action = await askDuncitActions.propose(ctx, ids, tool, args, typeof reason === 'string' ? reason : '');
    return {
      content: json({ status: 'awaiting_approval', action_id: String(action._id), what: tool.title }),
      call: { ...base, status: 'AWAITING_APPROVAL', duration_ms: 0, error_code: '', action_id: String(action._id) },
    };
  }

  const outcome = await runAsPerson(ctx, tool, args, reason, { approved: false });
  const audit = { actor: ctx.actor, conversation_id: ids.conversationId, message_id: ids.messageId, tool: tool.name, tool_args: args, latency_ms: outcome.durationMs };
  if (!outcome.ok) {
    const code = outcome.error?.code ?? 'ERROR';
    const denied = DENIED.has(code);
    let status: MessageToolCall['status'] = 'ERROR';
    if (denied) status = 'DENIED';
    else if (code === 'INJECTION_SUSPECTED') status = 'BLOCKED';
    else if (INVALID_CODES.has(code)) status = 'INVALID';
    await recordAudit({ type: 'TOOL_CALL', status: denied ? 'DENIED' : 'FAILED', error_code: code, error_message: outcome.error?.message, ...audit });
    if (denied) {
      await recordAudit({ type: 'VIOLATION', violation_kind: 'UNAUTHORIZED_ACCESS', status: 'DENIED', error_code: code, ...audit });
    }
    return {
      content: json({ status: denied ? 'denied' : 'error', code, message: outcome.error?.message }),
      call: { ...base, status, duration_ms: outcome.durationMs, error_code: code, action_id: null },
    };
  }

  const flags = inspectUntrusted(outcome.data);
  await recordAudit({ type: 'TOOL_CALL', ...audit, detail: flags.length ? { flags: flagIds(flags) } : undefined });
  if (flags.length) {
    await recordAudit({ type: 'VIOLATION', violation_kind: 'TOOL_OUTPUT_INJECTION', severity: 'WARN', reason: 'A tool result contains instruction-like text', detail: { flags: flagIds(flags) }, ...audit });
  }
  return {
    content: fenceUntrusted(`tool:${tool.name}`, truncate(json({ status: 'ok', data: outcome.data })), flags.length > 0),
    call: { ...base, status: 'OK', duration_ms: outcome.durationMs, error_code: '', action_id: null },
  };
}
