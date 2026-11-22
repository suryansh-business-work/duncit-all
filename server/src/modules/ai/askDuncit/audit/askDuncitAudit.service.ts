import { logs } from '@observability/log';
import { priceTokens } from '@modules/ai/openaiUsage/openaiUsage.service';
import { maskSensitiveText, maskToolArgs } from './askDuncit.redact';
import { auditHash } from './askDuncitAudit.hash';
import {
  AskDuncitAuditModel,
  type AuditSeverity,
  type AuditStatus,
  type AuditType,
  type ViolationKind,
} from './askDuncitAudit.model';

/** Who asked, from where — carried by every row a turn writes. */
export interface AuditActor {
  user_id: string | null;
  user_name?: string;
  role_key?: string;
  account_roles?: readonly string[];
  surface?: string;
  locale?: string;
  page_route?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface AuditEvent {
  type: AuditType;
  actor: AuditActor;
  severity?: AuditSeverity;
  status?: AuditStatus;
  conversation_id?: string | null;
  message_id?: string | null;
  action_id?: string | null;
  query?: string;
  response?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  tool?: string;
  tool_args?: unknown;
  violation_kind?: ViolationKind | null;
  reason?: string;
  error_code?: string;
  error_message?: string;
  latency_ms?: number;
  detail?: Record<string, unknown>;
}

const SEVERITY_BY_TYPE: Partial<Record<AuditType, AuditSeverity>> = {
  VIOLATION: 'CRITICAL',
  KILL_SWITCH: 'CRITICAL',
  ACTION_FAILED: 'WARN',
  OUT_OF_CONTEXT: 'WARN',
  ERROR: 'WARN',
  SETTINGS_CHANGED: 'WARN',
};

/**
 * Write one immutable audit row. Never throws to the caller — a turn must not
 * fail because its ledger line could not be written — but a failed write is
 * logged loudly, so a gap in the trail is itself on record.
 */
export async function recordAudit(event: AuditEvent): Promise<string | null> {
  try {
    const promptTokens = Math.max(0, Math.round(event.prompt_tokens ?? 0));
    const completionTokens = Math.max(0, Math.round(event.completion_tokens ?? 0));
    const { cost_usd } = event.model
      ? await priceTokens(event.model, promptTokens, completionTokens)
      : { cost_usd: 0 };
    const row = {
      type: event.type,
      severity: event.severity ?? SEVERITY_BY_TYPE[event.type] ?? 'INFO',
      status: event.status ?? 'OK',
      user_id: event.actor.user_id,
      user_name: event.actor.user_name ?? '',
      role_key: event.actor.role_key ?? '',
      account_roles: [...(event.actor.account_roles ?? [])],
      conversation_id: event.conversation_id ?? null,
      message_id: event.message_id ?? null,
      action_id: event.action_id ?? null,
      surface: event.actor.surface ?? '',
      locale: event.actor.locale ?? '',
      page_route: maskSensitiveText(event.actor.page_route, 300),
      entity_type: event.actor.entity_type ?? '',
      entity_id: event.actor.entity_id ?? '',
      query: maskSensitiveText(event.query),
      response: maskSensitiveText(event.response),
      model: event.model ?? '',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      cost_usd,
      tool: event.tool ?? '',
      tool_args: event.tool_args === undefined ? '' : maskToolArgs(event.tool_args),
      violation_kind: event.violation_kind ?? null,
      reason: maskSensitiveText(event.reason, 1000),
      error_code: event.error_code ?? '',
      error_message: maskSensitiveText(event.error_message, 1000),
      latency_ms: Math.max(0, Math.round(event.latency_ms ?? 0)),
      detail: event.detail ? maskSensitiveText(JSON.stringify(event.detail), 4000) : '',
      created_at: new Date(),
    };
    const doc = await AskDuncitAuditModel.create({ ...row, hash: auditHash(row) });
    return String(doc._id);
  } catch (error) {
    logs.server.error('askDuncit', 'auditWrite', { error, type: event.type, user_id: event.actor.user_id });
    return null;
  }
}
