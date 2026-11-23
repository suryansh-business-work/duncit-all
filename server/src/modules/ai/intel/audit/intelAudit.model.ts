import { createHash } from 'node:crypto';
import { Schema, model, type Types } from 'mongoose';

/**
 * Immutable audit trail for Duncit Intel: sign-ins to the console, settings and
 * connector changes, syncs, file actions, tool calls, approvals and every
 * production write. Rows are sealed with a SHA-256 over their content so an
 * edit made around Mongoose shows up as a broken seal. Text is masked before it
 * is written (intelAudit.service), never after.
 */

export const INTEL_AUDIT_TYPES = [
  'SESSION',
  'SETTINGS',
  'CONNECTOR',
  'SYNC',
  'MEDIA',
  'CHAT',
  'TOOL',
  'APPROVAL',
  'WRITE',
  'VIOLATION',
] as const;
export type IntelAuditType = (typeof INTEL_AUDIT_TYPES)[number];

export interface IIntelAudit {
  _id: Types.ObjectId;
  type: IntelAuditType;
  action: string;
  status: 'OK' | 'FAILED' | 'DENIED';
  user_id: Types.ObjectId | null;
  level: string;
  environment: string;
  target: string;
  detail: string;
  ip: string;
  hash: string;
  created_at: Date;
}

export const AUDIT_SEALED = ['type', 'action', 'status', 'user_id', 'level', 'environment', 'target', 'detail', 'ip', 'created_at'] as const;

const canonical = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined || value === null) return '';
  return String(value);
};

export function intelAuditHash(row: Partial<Record<(typeof AUDIT_SEALED)[number], unknown>>): string {
  const body = AUDIT_SEALED.map((field) => `${field}=${canonical(row[field])}`).join('\u001f');
  return createHash('sha256').update(body).digest('hex');
}

const intelAuditSchema = new Schema<IIntelAudit>(
  {
    type: { type: String, enum: INTEL_AUDIT_TYPES, required: true, index: true },
    action: { type: String, required: true, index: true },
    status: { type: String, enum: ['OK', 'FAILED', 'DENIED'], default: 'OK', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    level: { type: String, default: '' },
    environment: { type: String, default: '' },
    target: { type: String, default: '' },
    detail: { type: String, default: '' },
    ip: { type: String, default: '' },
    hash: { type: String, required: true },
    created_at: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false }
);

const refuse = () => {
  throw new Error('Intel audit rows are immutable');
};
intelAuditSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], refuse);

export const IntelAuditModel = model<IIntelAudit>('IntelAudit', intelAuditSchema, 'intel_audit');
