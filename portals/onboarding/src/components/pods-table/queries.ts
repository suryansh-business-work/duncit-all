import { gql } from '@apollo/client';

export type PodMode = 'PHYSICAL' | 'VIRTUAL';
export type PodApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';

/** Row shape shared by the venue-details and host-details pod tables. */
export interface PodRow {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_mode: PodMode;
  is_active: boolean;
  venue_approval_status: PodApprovalStatus;
  host_names: string[];
  club_slug: string | null;
}

export const PODS_TABLE = gql`
  query PodsTable($query: TableQueryInput) {
    podsTable(query: $query) {
      total
      rows {
        id
        pod_title
        pod_date_time
        pod_mode
        is_active
        venue_approval_status
        host_names
        club_slug
      }
    }
  }
`;
