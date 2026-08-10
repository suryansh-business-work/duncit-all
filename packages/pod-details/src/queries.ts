import { gql } from '@apollo/client';

/**
 * The FIELD SELECTIONS, shared by the admin queries below and by their
 * club-scoped twins in queries.club-admin.ts.
 *
 * Held as strings rather than duplicated into both documents: the two sets
 * feed the SAME components, so a field added to one and missed on the other
 * renders a blank cell for one audience only — the drift rule 34 exists to
 * stop. Interpolated into a gql template, so they are still parsed once.
 */
export const ATTENDEE_SELECTION = `
      member_id
      seats
      companions {
        name
        phone_extension
        phone_number
      }
      user_id
      full_name
      email
      phone
      profile_photo
      is_host
      status
      joined_at
      backed_out_at
      source
      refund_status
      payment_id
      backout_no
      replaced_by_user_id
      replaced_by_name
      participation {
        joined_at
        attended
        attended_at
        attendance_recorded
        pod_cancelled_by
        pod_cancelled_at
        cancel_refund_status
        backouts {
          backout_no
          status
          attempt_no
          seats
          seats_before
          refund_amount
          refund_status
          deduction_pct
          refund_processed_at
          created_at
          events {
            status
            at
          }
        }
      }
    }
`;

export const AUDIT_SELECTION = `
      id
      action
      source
      actor_name
      note
      ai_risk
      created_at
    }
`;

export const HOST_SELECTION = `
      id
      host_no
      full_name
      email
      phone
      status
    }
`;

export const PAYMENTS_SELECTION = `
      rows {
        id
        payment_id
        invoice_no
        user_id
        user_name
        user_email
        total
        currency_symbol
        status
        gateway
        coupon_code
        paid_at
        created_at
      }
      total
      page
      page_size
    }
`;

export const FEEDBACK_SELECTION = `
      pod_id
      total
      overall_average
      aspects {
        aspect
        average
        count
      }
      recent {
        id
        rating
        message
        created_at
        category
        user {
          id
          name
        }
        ratings {
          aspect
          rating
        }
      }
    }
`;

import type { PodParticipationFields } from '@duncit/utils';

export const POD_DETAIL = gql`
  query AdminPodDetail($id: ID!) {
    pod(pod_doc_id: $id, include_deleted: true) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      meeting_url
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      seats_taken
      seats_available
      pod_attendees
      pod_hosts_id
      host_names
      pod_hits
      zone_name
      club_id
      club_slug
      location_id
      venue_id
      products_enabled
      like_count
      comment_count
      is_active
      is_deleted
      deleted_at
      venue_approval_status
      completed_at
      created_at
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export const POD_ATTENDEES_ADMIN = gql`
  query AdminPodAttendees($id: ID!) {
    adminPodAttendees(pod_doc_id: $id) {
      ${ATTENDEE_SELECTION}
  }
`;

export const POD_AUDIT_TRAIL = gql`
  query AdminPodAuditTrail($id: ID!) {
    podAuditLogs(pod_doc_id: $id) {
      ${AUDIT_SELECTION}
  }
`;

export const POD_CLUB_DETAIL = gql`
  query AdminPodClubDetail($id: ID!) {
    club(club_doc_id: $id) {
      id
      club_name
      club_slug: club_id
      club_admins {
        id
        name
        avatar_url
      }
    }
  }
`;

export const POD_HOST_PROFILE = gql`
  query AdminPodHostProfile($user_id: ID!) {
    hostByUser(user_id: $user_id) {
      ${HOST_SELECTION}
  }
`;

export const POD_PAYMENTS_TABLE = gql`
  query AdminPodPaymentsTable($query: TableQueryInput) {
    paymentsTable(query: $query) {
      ${PAYMENTS_SELECTION}
  }
`;

/** One extra person on a booking, recorded at the door. */
export interface AdminPodCompanion {
  name: string;
  phone_extension: string | null;
  phone_number: string;
}

export interface AdminPodAttendeeRow {
  member_id: string | null;
  /** Seats this booking holds — one ticket admits this many. */
  seats: number;
  companions: AdminPodCompanion[];
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile_photo: string | null;
  is_host: boolean;
  status: 'JOINED' | 'BACKOUT_IN_PROCESS' | 'BACKED_OUT' | null;
  joined_at: string | null;
  backed_out_at: string | null;
  source: string | null;
  refund_status: string | null;
  payment_id: string | null;
  backout_no: string | null;
  replaced_by_user_id: string | null;
  replaced_by_name: string | null;
  /** This person's own story on the pod — null for a host seat with no booking. */
  participation: PodParticipationFields | null;
}

export interface PodPaymentRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  total: number;
  currency_symbol: string;
  status: string;
  gateway: string | null;
  coupon_code: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PodAuditEntry {
  id: string;
  action: string;
  source: string;
  actor_name: string;
  note: string;
  ai_risk: string;
  created_at: string;
}

/** What guests scored this pod on, part by part, plus the ratings themselves. */
export const POD_FEEDBACK_SUMMARY = gql`
  query AdminPodFeedbackSummary($pod_id: ID!) {
    podFeedbackSummary(pod_id: $pod_id) {
      ${FEEDBACK_SELECTION}
  }
`;

export interface PodAspectRating {
  aspect: string;
  average: number;
  count: number;
}

export interface PodFeedbackRow {
  id: string;
  rating: number;
  message: string;
  created_at: string;
  category: string;
  user: { id: string; name: string };
  ratings: Array<{ aspect: string; rating: number }>;
}

export const POD_FINANCE_BREAKDOWN = gql`
  query AdminPodFinanceBreakdown($pod_id: ID!) {
    podFinanceBreakdown(pod_id: $pod_id) {
      pod_id
      pod_title
      settlement_status
      frozen
      bookings_count
      collected_total
      currency_symbol
      has_venue
      completed_at
      waterfall {
        version
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        duncit_revenue
        host_earn_pct
      }
    }
  }
`;
