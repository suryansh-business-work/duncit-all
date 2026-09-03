import { gql } from '@apollo/client';
import { formatDateTime } from '@duncit/app-settings';

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

/** The audit vocabulary itself — the row type, tones, labels and filter
 * options — lives in `@duncit/utils` (`pod-audit`), so the apps read it too. */
export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  return formatDateTime(iso) || '—';
};
