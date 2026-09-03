import {
  POD_AUDIT_ACTION_ORDER,
  POD_AUDIT_RISK_ORDER,
  POD_AUDIT_SOURCE_ORDER,
  type PodAuditLog,
} from '@duncit/utils';

/** The row both audit documents answer — the table page and the per-pod
 * trail select the same fields, so one mapper reads either. */
export interface AuditLogSource {
  id: string;
  pod_id: string;
  pod_title: string;
  club_id?: string | null;
  actor_user_id?: string | null;
  actor_name: string;
  source: string;
  action: string;
  changes: readonly { field: string; from: string; to: string }[];
  note: string;
  ai_risk: string;
  ai_summary: string;
  ai_reviewed_at?: string | null;
  created_at: string;
}

/** Narrows a server enum value onto the shared vocabulary, with the value the
 * chips fall back to for an entry this build predates. */
const oneOf = <T extends string>(order: readonly T[], value: string, fallback: T): T =>
  (order as readonly string[]).includes(value) ? (value as T) : fallback;

/** The generated row as the shared audit helpers read it. */
export function toPodAuditLog(row: AuditLogSource): PodAuditLog {
  return {
    id: row.id,
    pod_id: row.pod_id,
    pod_title: row.pod_title,
    club_id: row.club_id ?? null,
    actor_user_id: row.actor_user_id ?? null,
    actor_name: row.actor_name,
    source: oneOf(POD_AUDIT_SOURCE_ORDER, row.source, 'SYSTEM'),
    action: oneOf(POD_AUDIT_ACTION_ORDER, row.action, 'UPDATE'),
    changes: row.changes.map((change) => ({
      field: change.field,
      from: change.from,
      to: change.to,
    })),
    note: row.note,
    ai_risk: oneOf(POD_AUDIT_RISK_ORDER, row.ai_risk, 'PENDING'),
    ai_summary: row.ai_summary,
    ai_reviewed_at: row.ai_reviewed_at ?? null,
    created_at: row.created_at,
  };
}
