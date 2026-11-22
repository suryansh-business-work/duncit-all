import { gql } from '@apollo/client';

export interface HostEngagementStatusOption {
  key: string;
  label: string;
  is_active: boolean;
}

export interface HostScorePoint {
  period: string;
  completed: number;
  target: number;
  score: number;
}

/** One host of the club in full (clubAdminHostDetail). */
export interface ClubHostDetail {
  user_id: string;
  club_id: string;
  club_name: string;
  name: string;
  photo_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  last_pod_at?: string | null;
  days_since_last_pod?: number | null;
  completed_this_month: number;
  upcoming_count: number;
  monthly_target: number;
  score: number;
  is_inactive: boolean;
  inactivity_days: number;
  engagement_status_key: string;
  engagement_status_label: string;
  engagement_note?: string | null;
  engagement_updated_at?: string | null;
  statuses: HostEngagementStatusOption[];
  score_history: HostScorePoint[];
}

/** Null when the user does not host this club; FORBIDDEN when the caller does not administer it. */
export const CLUB_ADMIN_HOST_DETAIL = gql`
  query ClubAdminHostDetail($club_id: ID!, $user_id: ID!) {
    clubAdminHostDetail(club_id: $club_id, user_id: $user_id) {
      user_id
      club_id
      club_name
      name
      photo_url
      phone
      whatsapp
      email
      last_pod_at
      days_since_last_pod
      completed_this_month
      upcoming_count
      monthly_target
      score
      is_inactive
      inactivity_days
      engagement_status_key
      engagement_status_label
      engagement_note
      engagement_updated_at
      statuses {
        key
        label
        is_active
      }
      score_history {
        period
        completed
        target
        score
      }
    }
  }
`;

export const SET_CLUB_HOST_ENGAGEMENT = gql`
  mutation SetClubHostEngagement($club_id: ID!, $host_user_id: ID!, $status_key: String!, $note: String) {
    setClubHostEngagement(club_id: $club_id, host_user_id: $host_user_id, status_key: $status_key, note: $note) {
      host_user_id
      status_key
      status_label
      note
      updated_at
    }
  }
`;

/**
 * The host's pods in this club, one lifecycle bucket at a time (the Upcoming /
 * Past tabs). Only the fields the shared PodsTable reads — not the wide editor
 * fragment the club's own pods page selects.
 */
export const CLUB_ADMIN_HOST_PODS_TABLE = gql`
  query ClubAdminHostPodsTable($club_id: ID, $query: TableQueryInput, $lifecycle: PodLifecycle) {
    clubAdminPodsTable(club_id: $club_id, query: $query, lifecycle: $lifecycle) {
      total
      rows {
        id
        pod_title
        club_id
        venue_id
        pod_mode
        pod_date_time
        pod_amount
        pod_attendees
        no_of_spots
        attendance {
          attended_seats
          booked_seats
          recorded
        }
        is_active
        is_deleted
        completed_at
        venue_approval_status
      }
    }
  }
`;

/** Venue names for the pods table's Place column — the same public list the club's pods page reads. */
export const CLUB_HOST_VENUE_NAMES = gql`
  query ClubHostVenueNames {
    publicVenues {
      id
      venue_name
    }
  }
`;
