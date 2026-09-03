import type { ClubAdminTranslate } from './club-admin-copy';
import type { StatusOption, StatusTone } from './pod-row-status';

/**
 * The AI-monitored audit trail of a pod — what happened to it, who did it and
 * how risky the monitor judged the change — as one vocabulary.
 *
 * The Pod Monitoring page and the per-pod Activity dialog both read it, on the
 * Partners console AND on the two apps (rule 27), so the words, the tones and
 * the order the filters list them in are decided here rather than beside each
 * table. Nothing here touches React: the copy arrives through `t`.
 */

/** Every action the monitor records, in the order the Action filter lists them. */
export const POD_AUDIT_ACTION_ORDER = [
  'CREATE',
  'UPDATE',
  'RESUBMIT',
  'DELETE',
  'VENUE_APPROVED',
  'VENUE_DECLINED',
  'COMPLETE',
  'REJECTED',
] as const;

export type PodAuditAction = (typeof POD_AUDIT_ACTION_ORDER)[number];

/** Who made the change, in the order the By filter lists them. */
export const POD_AUDIT_SOURCE_ORDER = ['ADMIN', 'CLUB_ADMIN', 'HOST', 'VENUE_OWNER', 'SYSTEM'] as const;

export type PodAuditSource = (typeof POD_AUDIT_SOURCE_ORDER)[number];

/** The three verdicts first, then the entries the monitor has not scored yet. */
export const POD_AUDIT_RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'PENDING'] as const;

export type PodAuditRisk = (typeof POD_AUDIT_RISK_ORDER)[number];

/** One tracked field, before and after. */
export interface PodAuditChange {
  field: string;
  from: string;
  to: string;
}

/** One entry of the trail, as `clubAdminPodAuditLogs` / `podAuditLogs` answer it. */
export interface PodAuditLog {
  id: string;
  pod_id: string;
  pod_title: string;
  club_id: string | null;
  actor_user_id: string | null;
  actor_name: string;
  source: PodAuditSource;
  action: PodAuditAction;
  changes: PodAuditChange[];
  note: string;
  ai_risk: PodAuditRisk;
  ai_summary: string;
  ai_reviewed_at: string | null;
  created_at: string;
}

export const POD_AUDIT_ACTION_COLORS: Record<PodAuditAction, StatusTone> = {
  CREATE: 'success',
  UPDATE: 'info',
  RESUBMIT: 'info',
  DELETE: 'error',
  VENUE_APPROVED: 'success',
  VENUE_DECLINED: 'warning',
  COMPLETE: 'default',
  REJECTED: 'error',
};

export const POD_AUDIT_RISK_COLORS: Record<PodAuditRisk, StatusTone> = {
  PENDING: 'default',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

/** One literal key per value (see `podRowStatusLabel` for why). */
export function podAuditActionLabel(action: PodAuditAction, t: ClubAdminTranslate): string {
  if (action === 'CREATE') return t('clubAdmin.audit.action.create');
  if (action === 'UPDATE') return t('clubAdmin.audit.action.update');
  if (action === 'RESUBMIT') return t('clubAdmin.audit.action.resubmit');
  if (action === 'DELETE') return t('clubAdmin.audit.action.delete');
  if (action === 'VENUE_APPROVED') return t('clubAdmin.audit.action.venueApproved');
  if (action === 'VENUE_DECLINED') return t('clubAdmin.audit.action.venueDeclined');
  if (action === 'COMPLETE') return t('clubAdmin.audit.action.complete');
  return t('clubAdmin.audit.action.rejected');
}

export function podAuditSourceLabel(source: PodAuditSource, t: ClubAdminTranslate): string {
  if (source === 'ADMIN') return t('clubAdmin.audit.source.admin');
  if (source === 'CLUB_ADMIN') return t('clubAdmin.audit.source.clubAdmin');
  if (source === 'HOST') return t('clubAdmin.audit.source.host');
  if (source === 'VENUE_OWNER') return t('clubAdmin.audit.source.venueOwner');
  return t('clubAdmin.audit.source.system');
}

export function podAuditRiskLabel(risk: PodAuditRisk, t: ClubAdminTranslate): string {
  if (risk === 'LOW') return t('clubAdmin.audit.risk.low');
  if (risk === 'MEDIUM') return t('clubAdmin.audit.risk.medium');
  if (risk === 'HIGH') return t('clubAdmin.audit.risk.high');
  return t('clubAdmin.audit.risk.pending');
}

/** Filter options, one per action in `POD_AUDIT_ACTION_ORDER`. */
export function podAuditActionOptions(t: ClubAdminTranslate): StatusOption<PodAuditAction>[] {
  return POD_AUDIT_ACTION_ORDER.map((value) => ({ value, label: podAuditActionLabel(value, t) }));
}

export function podAuditSourceOptions(t: ClubAdminTranslate): StatusOption<PodAuditSource>[] {
  return POD_AUDIT_SOURCE_ORDER.map((value) => ({ value, label: podAuditSourceLabel(value, t) }));
}

export function podAuditRiskOptions(t: ClubAdminTranslate): StatusOption<PodAuditRisk>[] {
  return POD_AUDIT_RISK_ORDER.map((value) => ({ value, label: podAuditRiskLabel(value, t) }));
}
