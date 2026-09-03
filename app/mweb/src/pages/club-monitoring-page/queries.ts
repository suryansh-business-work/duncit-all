import { gql } from '@apollo/client';

/**
 * The AI-monitored trail across every club the caller administers — the same
 * server-paged query the Partners console tables, read here one page at a
 * time. Its own operation name: the console's copy is
 * `ClubAdminPodAuditLogsTable`, and operation names are unique repo-wide.
 */
export const MWEB_CLUB_ADMIN_POD_AUDIT_LOGS_TABLE = gql`
  query MwebClubAdminPodAuditLogsTable($query: TableQueryInput) {
    clubAdminPodAuditLogsTable(query: $query) {
      total
      rows {
        id
        pod_id
        pod_title
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
        created_at
      }
    }
  }
`;
