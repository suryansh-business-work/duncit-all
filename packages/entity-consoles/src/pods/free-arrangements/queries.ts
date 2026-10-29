import { gql } from '@apollo/client';

/** Why a pod or its venue is free, as its host gave it (`FreeJustification`). */
export interface FreeJustificationRow {
  reason: string;
  details: string;
  accepted_at?: string | null;
}

/** One free pod, free venue request, or both (`FreeArrangementRow`) — the fields the table reads. */
export interface FreeArrangementRow {
  id: string;
  pod_slug: string;
  pod_title: string;
  pod_type: string;
  pod_date_time?: string | null;
  /** FREE_POD, FREE_VENUE or BOTH. */
  kind: string;
  host_name: string;
  host_email: string;
  club_name: string;
  venue_name: string;
  /** NONE, PENDING, APPROVED or DECLINED: the venue's answer. */
  venue_approval_status: string;
  is_active: boolean;
  cancelled: boolean;
  created_at?: string | null;
  free_justification?: FreeJustificationRow | null;
  venue_free_justification?: FreeJustificationRow | null;
}

/**
 * Pods console › Free Arrangements: every free pod and free venue request with
 * the justification its host gave, newest first. Host, club and venue names
 * come joined by the server, one lookup each per page.
 */
export const FREE_ARRANGEMENTS_TABLE = gql`
  query AdminFreeArrangementsTable($query: TableQueryInput) {
    adminFreeArrangementsTable(query: $query) {
      total
      rows {
        id
        pod_slug
        pod_title
        pod_type
        pod_date_time
        kind
        host_name
        host_email
        club_name
        venue_name
        venue_approval_status
        is_active
        cancelled
        created_at
        free_justification {
          reason
          details
          accepted_at
        }
        venue_free_justification {
          reason
          details
          accepted_at
        }
      }
    }
  }
`;
