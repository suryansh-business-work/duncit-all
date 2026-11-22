import { createHash } from 'node:crypto';

/**
 * The tamper-evidence seal on an audit row: SHA-256 over its content fields in
 * a fixed order. Recomputing it later and comparing proves the row is as it was
 * written — the model refuses edits through Mongoose, this catches the ones
 * made around it.
 */

/** Fields sealed, in order. `hash` and `_id` are not part of the content. */
export const SEALED_FIELDS = [
  'type',
  'severity',
  'status',
  'user_id',
  'role_key',
  'conversation_id',
  'message_id',
  'action_id',
  'query',
  'response',
  'model',
  'total_tokens',
  'tool',
  'tool_args',
  'violation_kind',
  'reason',
  'error_code',
  'detail',
  'created_at',
] as const;

type Sealable = Partial<Record<(typeof SEALED_FIELDS)[number], unknown>>;

const canonical = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined || value === null) return '';
  return String(value);
};

export function auditHash(row: Sealable): string {
  const body = SEALED_FIELDS.map((field) => `${field}=${canonical(row[field])}`).join('\u001f');
  return createHash('sha256').update(body).digest('hex');
}

export const verifyAuditHash = (row: Sealable & { hash?: string | null }): boolean =>
  typeof row.hash === 'string' && row.hash === auditHash(row);
