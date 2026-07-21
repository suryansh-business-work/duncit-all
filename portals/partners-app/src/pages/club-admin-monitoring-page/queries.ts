import { gql } from '@apollo/client';

/** Club-scoped AI-monitored pod activity (the server pins visibility to the
 * clubs the caller administers; SUPER_ADMIN sees everything). */
export const CLUB_ADMIN_POD_AUDIT_LOGS_TABLE = gql`
  query ClubAdminPodAuditLogsTable($query: TableQueryInput) {
    clubAdminPodAuditLogsTable(query: $query) {
      total
      rows {
        id
        pod_id
        pod_title
        club_id
        actor_user_id
        actor_name
        source
        action
        changes {
          field
          from
          to
        }
        note
        ai_risk
        ai_summary
        ai_reviewed_at
        created_at
      }
    }
  }
`;

export type PodAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'RESUBMIT'
  | 'DELETE'
  | 'VENUE_APPROVED'
  | 'VENUE_DECLINED'
  | 'COMPLETE';
export type PodAuditSource = 'ADMIN' | 'CLUB_ADMIN' | 'HOST' | 'VENUE_OWNER' | 'SYSTEM';
export type PodAuditRisk = 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface PodAuditChange {
  field: string;
  from: string;
  to: string;
}

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

export type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

export const ACTION_LABELS: Record<PodAuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Edited',
  RESUBMIT: 'Resubmitted',
  DELETE: 'Deleted',
  VENUE_APPROVED: 'Venue Approved',
  VENUE_DECLINED: 'Venue Rejected',
  COMPLETE: 'Completed',
};

export const ACTION_COLORS: Record<PodAuditAction, ChipColor> = {
  CREATE: 'success',
  UPDATE: 'info',
  RESUBMIT: 'info',
  DELETE: 'error',
  VENUE_APPROVED: 'success',
  VENUE_DECLINED: 'warning',
  COMPLETE: 'default',
};

export const RISK_COLORS: Record<PodAuditRisk, ChipColor> = {
  PENDING: 'default',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

export const SOURCE_LABELS: Record<PodAuditSource, string> = {
  ADMIN: 'Admin Portal',
  CLUB_ADMIN: 'Club Admin',
  HOST: 'Host',
  VENUE_OWNER: 'Venue Owner',
  SYSTEM: 'System',
};

export const ACTION_OPTIONS = (Object.keys(ACTION_LABELS) as PodAuditAction[]).map((value) => ({
  value,
  label: ACTION_LABELS[value],
}));

export const RISK_OPTIONS = (['LOW', 'MEDIUM', 'HIGH', 'PENDING'] as PodAuditRisk[]).map((value) => ({
  value,
  label: value,
}));

export const SOURCE_OPTIONS = (Object.keys(SOURCE_LABELS) as PodAuditSource[]).map((value) => ({
  value,
  label: SOURCE_LABELS[value],
}));

export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};
