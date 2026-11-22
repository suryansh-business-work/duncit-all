import { Schema, model, type Query, type Types } from 'mongoose';

/**
 * The Ask Duncit audit trail: one immutable row per thing that happened —
 * a question, an answer, a tool call, an approval, a refusal, a handover, a
 * settings change. Chat History & Logs, Out-of-Context Queries and Security &
 * Access Violations in the AI portal are all views over this one collection.
 *
 * Immutable by construction: every update and delete path throws, and each row
 * carries a SHA-256 of its own content (`hash`), so an edit made straight in
 * the database is detectable (`verifyAuditHash`).
 */

export const AUDIT_TYPES = [
  'QUERY',
  'RESPONSE',
  'TOOL_CALL',
  'ACTION_PROPOSED',
  'ACTION_APPROVED',
  'ACTION_REJECTED',
  'ACTION_EXECUTED',
  'ACTION_FAILED',
  'ACTION_ROLLED_BACK',
  'VIOLATION',
  'OUT_OF_CONTEXT',
  'HANDOVER',
  'FEEDBACK',
  'FEEDBACK_REVIEWED',
  'SETTINGS_CHANGED',
  'KILL_SWITCH',
  'KNOWLEDGE_CHANGED',
  'ERROR',
] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

export const VIOLATION_KINDS = [
  'PROMPT_INJECTION',
  'FILE_INJECTION',
  'TOOL_OUTPUT_INJECTION',
  'UNAUTHORIZED_TOOL',
  'UNAUTHORIZED_ACCESS',
  'PRIVILEGE_ESCALATION',
  'RATE_LIMIT',
  'QUOTA_EXCEEDED',
] as const;
export type ViolationKind = (typeof VIOLATION_KINDS)[number];

export const AUDIT_SEVERITIES = ['INFO', 'WARN', 'CRITICAL'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_STATUSES = ['OK', 'FAILED', 'BLOCKED', 'DENIED'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export interface IAskDuncitAudit {
  _id: Types.ObjectId;
  type: AuditType;
  severity: AuditSeverity;
  status: AuditStatus;
  user_id: string | null;
  user_name: string;
  role_key: string;
  account_roles: string[];
  conversation_id: string | null;
  message_id: string | null;
  action_id: string | null;
  surface: string;
  locale: string;
  page_route: string;
  entity_type: string;
  entity_id: string;
  query: string;
  response: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  tool: string;
  tool_args: string;
  violation_kind: ViolationKind | null;
  reason: string;
  error_code: string;
  error_message: string;
  latency_ms: number;
  detail: string;
  hash: string;
  created_at: Date;
}

const auditSchema = new Schema<IAskDuncitAudit>(
  {
    type: { type: String, enum: AUDIT_TYPES, required: true },
    severity: { type: String, enum: AUDIT_SEVERITIES, default: 'INFO' },
    status: { type: String, enum: AUDIT_STATUSES, default: 'OK' },
    user_id: { type: String, default: null },
    user_name: { type: String, default: '' },
    role_key: { type: String, default: '' },
    account_roles: { type: [String], default: [] },
    conversation_id: { type: String, default: null },
    message_id: { type: String, default: null },
    action_id: { type: String, default: null },
    surface: { type: String, default: '' },
    locale: { type: String, default: '' },
    page_route: { type: String, default: '' },
    entity_type: { type: String, default: '' },
    entity_id: { type: String, default: '' },
    query: { type: String, default: '' },
    response: { type: String, default: '' },
    model: { type: String, default: '' },
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 },
    cost_usd: { type: Number, default: 0 },
    tool: { type: String, default: '' },
    tool_args: { type: String, default: '' },
    violation_kind: { type: String, enum: [...VIOLATION_KINDS, null], default: null },
    reason: { type: String, default: '' },
    error_code: { type: String, default: '' },
    error_message: { type: String, default: '' },
    latency_ms: { type: Number, default: 0 },
    detail: { type: String, default: '' },
    hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false }
);

auditSchema.index({ created_at: -1 });
auditSchema.index({ type: 1, created_at: -1 });
auditSchema.index({ user_id: 1, created_at: -1 });
auditSchema.index({ conversation_id: 1, created_at: 1 });
auditSchema.index({ violation_kind: 1, created_at: -1 });
auditSchema.index({ role_key: 1, created_at: -1 });
auditSchema.index({ query: 'text', response: 'text', tool: 'text' });

const immutable = () => {
  throw new Error('Ask Duncit audit rows are immutable');
};

/** Every query that could change or remove a stored row. */
export const AUDIT_WRITE_QUERIES =
  /^(updateOne|updateMany|findOneAndUpdate|replaceOne|findOneAndReplace|deleteOne|deleteMany|findOneAndDelete)$/;

auditSchema.pre(AUDIT_WRITE_QUERIES, { document: false, query: true }, function (this: Query<unknown, unknown>) {
  immutable();
});

auditSchema.pre('save', function () {
  if (!this.isNew) immutable();
});

auditSchema.pre('deleteOne', { document: true, query: false }, function () {
  immutable();
});

export const AskDuncitAuditModel = model<IAskDuncitAudit>('AskDuncitAudit', auditSchema);
