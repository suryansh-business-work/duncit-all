import { gql } from '@apollo/client';
import { formatDateTime } from '@duncit/app-settings';

export const POD_AUDIT_LOGS_TABLE = gql`
  query PodAuditLogsTable($query: TableQueryInput) {
    podAuditLogsTable(query: $query) {
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

/** The AI-monitored action trail of one pod, for the per-pod activity dialog. */
export const POD_AUDIT_LOGS = gql`
  query PodAuditLogs($pod_doc_id: ID!) {
    podAuditLogs(pod_doc_id: $pod_doc_id) {
      id
      action
      source
      actor_name
      note
      changes { field from to }
      ai_risk
      ai_summary
      created_at
    }
  }
`;

/** The audit vocabulary itself — the row type, tones, labels and filter
 * options — lives in `@duncit/utils` (`pod-audit`), shared with the Partners
 * console and the apps. */
export const fmtWhen = (iso?: string | null) => formatDateTime(iso) || '—';
