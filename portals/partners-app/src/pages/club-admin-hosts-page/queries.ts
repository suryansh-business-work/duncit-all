import { gql } from '@apollo/client';

/** One host of the club — the Hosts table row (clubAdminClubHostsTable rows). */
export interface ClubHostRow {
  user_id: string;
  name: string;
  photo_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  last_pod_at?: string | null;
  completed_this_month: number;
  upcoming_count: number;
  monthly_target: number;
  score: number;
  is_inactive: boolean;
  engagement_status_key: string;
  engagement_status_label: string;
}

/** Counts over every host of the club, for the header and the inactive-hosts warning. */
export interface ClubHostsSummary {
  club_id: string;
  club_name: string;
  host_count: number;
  inactive_count: number;
  inactivity_days: number;
  monthly_pod_target: number;
}

/**
 * Club-scoped server-side: the server proves the caller administers this club
 * before reading a single host, so a club id in the URL cannot widen it.
 */
export const CLUB_ADMIN_CLUB_HOSTS_TABLE = gql`
  query ClubAdminClubHostsTable($club_id: ID!, $query: TableQueryInput) {
    clubAdminClubHostsTable(club_id: $club_id, query: $query) {
      total
      rows {
        user_id
        name
        photo_url
        phone
        whatsapp
        email
        last_pod_at
        completed_this_month
        upcoming_count
        monthly_target
        score
        is_inactive
        engagement_status_key
        engagement_status_label
      }
    }
  }
`;

export const CLUB_ADMIN_CLUB_HOSTS_SUMMARY = gql`
  query ClubAdminClubHostsSummary($club_id: ID!) {
    clubAdminClubHostsSummary(club_id: $club_id) {
      club_id
      club_name
      host_count
      inactive_count
      inactivity_days
      monthly_pod_target
    }
  }
`;
