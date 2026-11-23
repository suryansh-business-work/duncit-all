import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { maskSensitiveText } from '@modules/ai/askDuncit/audit/askDuncit.redact';
import { IntelAuditModel, intelAuditHash, type IntelAuditType } from './intelAudit.model';

/**
 * Writes Intel audit rows. Never throws: a feature must not fail because its
 * audit row could not be written, but the failure is logged loudly so it is
 * seen (no silent loss).
 */

export interface AuditInput {
  type: IntelAuditType;
  action: string;
  status?: 'OK' | 'FAILED' | 'DENIED';
  userId?: string | null;
  level?: string;
  environment?: string;
  target?: string;
  detail?: string;
  ip?: string;
}

const toObjectId = (id?: string | null) => (id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null);

export async function writeAudit(input: AuditInput): Promise<void> {
  const row = {
    type: input.type,
    action: input.action.slice(0, 120),
    status: input.status ?? 'OK',
    user_id: toObjectId(input.userId),
    level: input.level ?? '',
    environment: input.environment ?? '',
    target: maskSensitiveText(input.target ?? '', 300),
    detail: maskSensitiveText(input.detail ?? '', 4000),
    ip: (input.ip ?? '').slice(0, 64),
    created_at: new Date(),
  };
  try {
    await IntelAuditModel.create({ ...row, hash: intelAuditHash(row) });
  } catch (error) {
    logs.server.error('intel', 'audit', { error, action: input.action });
  }
}

export interface AuditListArgs {
  type?: string | null;
  status?: string | null;
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listAudit(args: AuditListArgs) {
  const filter: Record<string, unknown> = {};
  if (args.type) filter.type = args.type;
  if (args.status) filter.status = args.status;
  if (args.search?.trim()) {
    const rx = new RegExp(escapeRegex(args.search.trim().slice(0, 100)), 'i');
    filter.$or = [{ action: rx }, { target: rx }, { detail: rx }];
  }
  const pageSize = Math.min(Math.max(args.page_size ?? 25, 1), 100);
  const page = Math.max(args.page ?? 1, 1);
  const [rows, total] = await Promise.all([
    IntelAuditModel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    IntelAuditModel.countDocuments(filter),
  ]);
  return {
    total,
    rows: rows.map((r) => ({
      id: String(r._id),
      type: r.type,
      action: r.action,
      status: r.status,
      user_id: r.user_id ? String(r.user_id) : null,
      level: r.level,
      environment: r.environment,
      target: r.target,
      detail: r.detail,
      created_at: r.created_at,
      sealed: r.hash === intelAuditHash(r),
    })),
  };
}
