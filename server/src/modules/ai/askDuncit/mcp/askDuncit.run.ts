import { runToolCall } from '@microservices/mcp/execute/pipeline';
import { META_CONFIRM, META_GUARD, META_PARAMS, META_REASON } from '@microservices/mcp/mcp.constants';
import type { McpTool, ToolCallOutcome } from '@microservices/mcp/tools/tool.types';
import type { TurnContext } from '../turn/askDuncit.context';

/**
 * Run one tool as the person through the MCP pipeline. The ONLY place Ask
 * Duncit executes anything.
 *
 * Meta parameters are the server's, never the model's: anything named mcp_*
 * in the model's arguments is dropped, the reason is set here, the injection
 * guard is always `block`, and `mcp_confirm` is passed only for an action the
 * person approved (actions service) — so a model cannot approve on its own.
 */

const REASON_FALLBACK = 'Requested by the person in Ask Duncit';

export function stripMetaParams(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return {};
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).filter(([key]) => !(META_PARAMS as readonly string[]).includes(key))
  );
}

export function reasonFor(reason: unknown): string {
  const text = typeof reason === 'string' ? reason.trim() : '';
  const full = text.length >= 3 ? `Ask Duncit: ${text}` : REASON_FALLBACK;
  return full.slice(0, 500);
}

export interface RunOptions {
  /** True only when the person approved this exact call. */
  approved: boolean;
}

export async function runAsPerson(
  ctx: TurnContext,
  tool: McpTool,
  args: Record<string, unknown>,
  reason: unknown,
  options: RunOptions
): Promise<ToolCallOutcome & { durationMs: number }> {
  const started = performance.now();
  const callArgs: Record<string, unknown> = {
    ...stripMetaParams(args),
    [META_GUARD]: 'block',
  };
  if (tool.risk !== 'READ') callArgs[META_REASON] = reasonFor(reason);
  if (options.approved && tool.confirm) callArgs[META_CONFIRM] = true;
  const { outcome } = await runToolCall(ctx.session, tool.name, callArgs, { viaGateway: true });
  return { ...outcome, durationMs: Math.round(performance.now() - started) };
}
