import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { CHARS_PER_TOKEN } from '../mcp.constants';
import type { McpSettingsValue } from '../settings/settings.types';
import { McpToolCallModel, type ToolCallStatus } from './usage.model';
import { redactArgs } from './redact';

/**
 * Writes one activity row per tool call, and the matching structured log line
 * (SigNoz). Recording must never be able to fail the call it describes, so
 * every error here is logged and swallowed — a missing row is a gap in a chart,
 * a thrown recorder is an answer the AI never gets.
 *
 * Tokens are an ESTIMATE of what the call put into the model's context (the
 * arguments it wrote and the result it read back), at CHARS_PER_TOKEN; the AI
 * provider's own bill is the authority, which an MCP server cannot see.
 */

export interface ToolCallRecord {
  user: AuthUser;
  connectionId: string | null;
  clientName: string;
  userAgent: string | null;
  ip: string | null;
  endpoint: string;
  tool: string;
  category: string;
  kind: string;
  risk: string;
  reason: string | null;
  args: unknown;
  status: ToolCallStatus;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
  inputChars: number;
  outputChars: number;
  injectionFlags: readonly string[];
  guardMode: string;
  settings: Pick<McpSettingsValue, 'token_price_input_per_million' | 'token_price_output_per_million' | 'currency'>;
}

export const estimateTokens = (chars: number): number => Math.ceil(Math.max(0, chars) / CHARS_PER_TOKEN);

/** Cost at per-million rates, kept to six decimals (a single call is often a fraction of a cent). */
export function costOf(inputTokens: number, outputTokens: number, settings: ToolCallRecord['settings']): number {
  const raw =
    (inputTokens * settings.token_price_input_per_million + outputTokens * settings.token_price_output_per_million) /
    1_000_000;
  return Math.round(raw * 1_000_000) / 1_000_000;
}

const objectIdOrNull = (id: string | null): Types.ObjectId | null =>
  id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export async function recordToolCall(record: ToolCallRecord): Promise<void> {
  const inputTokens = estimateTokens(record.inputChars);
  const outputTokens = estimateTokens(record.outputChars);
  const cost = costOf(inputTokens, outputTokens, record.settings);
  logs.server.info('mcp', 'toolCall', {
    tool: record.tool,
    endpoint: record.endpoint,
    status: record.status,
    errorCode: record.errorCode,
    durationMs: record.durationMs,
    userId: record.user.id,
    clientName: record.clientName,
    inputTokens,
    outputTokens,
  });
  try {
    await McpToolCallModel.create({
      user_id: new Types.ObjectId(record.user.id),
      user_email: record.user.email ?? null,
      connection_id: objectIdOrNull(record.connectionId),
      client_name: record.clientName,
      user_agent: record.userAgent,
      ip: record.ip,
      endpoint: record.endpoint,
      tool: record.tool,
      category: record.category,
      kind: record.kind,
      risk: record.risk,
      reason: record.reason,
      args_preview: redactArgs(record.args),
      status: record.status,
      error_code: record.errorCode,
      error_message: record.errorMessage?.slice(0, 1000) ?? null,
      duration_ms: Math.round(record.durationMs),
      input_chars: record.inputChars,
      output_chars: record.outputChars,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost,
      currency: record.settings.currency,
      injection_flags: [...record.injectionFlags],
      guard_mode: record.guardMode,
    });
  } catch (error) {
    logs.server.error('mcp', 'recordToolCall', { error, tool: record.tool });
  }
}
