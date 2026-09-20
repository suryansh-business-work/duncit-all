import { gql } from '@/generated/graphql';

/**
 * The Club Admin's pod DETAIL reads on the phone — the Tamagui twin of the
 * CLUB_ADMIN scope `@duncit/pod-details` renders on mWeb and in the Partners
 * console (rule 27).
 *
 * Re-declared here rather than imported from that package: it is MUI, the
 * native app cannot consume it, and the mobile codegen only sees documents
 * written inline in this workspace — the same reason `attendance.ts` states.
 * Every root field is the club-scoped twin of an admin query, gated on
 * `assertClubAdminForPod`, so another club's pod is FORBIDDEN whatever the
 * route says.
 *
 * The pod itself comes from `clubAdminPodForEdit` rather than the public `pod`
 * query: that one only honours `include_deleted` for platform reviewers, and a
 * club admin must still be able to open the pod they just cancelled.
 */
export const ClubAdminPodDetailDocument = gql(`
  query MobileClubAdminPodDetail($pod_doc_id: ID!) {
    clubAdminPodForEdit(pod_doc_id: $pod_doc_id) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      pod_type
      pod_amount
      no_of_spots
      seats_taken
      pod_hits
      like_count
      comment_count
      zone_name
      place_label
      products_enabled
      is_active
      is_deleted
      deleted_at
      completed_at
      created_at
      venue_approval_status
      pod_hosts_id
      host_names
      ticket_discount_enabled
      ticket_discount_tiers {
        min_tickets
        discount_pct
      }
      attendance {
        attended_seats
        booked_seats
        recorded
      }
      # The club and the people who run it, in one round trip — mWeb reads the
      # same two cards off a single club document for the same reason.
      club {
        id
        club_id
        club_name
        club_admins {
          id
          name
          avatar_url
          email
          phone
          whatsapp
        }
      }
    }
  }
`);

/** Everyone on the pod, with the participation fields the Visited/Joined
 * label is decided from in `@duncit/utils`. */
export const ClubAdminPodAttendeesDocument = gql(`
  query MobileClubAdminPodAttendees($pod_doc_id: ID!) {
    clubAdminPodAttendees(pod_doc_id: $pod_doc_id) {
      member_id
      user_id
      seats
      full_name
      email
      phone
      profile_photo
      is_host
      status
      joined_at
      source
      refund_status
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
      }
    }
  }
`);

/**
 * The host profile behind ONE of this pod's hosts — host number and approval
 * status. Scoped to the pod, so a club admin reads the host running their pod
 * rather than looking up any host by id.
 */
export const ClubAdminPodHostDocument = gql(`
  query MobileClubAdminPodHost($pod_doc_id: ID!, $user_id: ID!) {
    clubAdminPodHost(pod_doc_id: $pod_doc_id, user_id: $user_id) {
      id
      host_no
      full_name
      email
      phone
      status
    }
  }
`);

/**
 * Every payment on this pod. The pod travels as its own argument rather than
 * inside the free-form table query: that input can express "every payment on
 * the platform", so the filter is applied server-side where a caller cannot
 * widen it.
 */
export const ClubAdminPodPaymentsDocument = gql(`
  query MobileClubAdminPodPayments($pod_doc_id: ID!, $query: TableQueryInput) {
    clubAdminPodPayments(pod_doc_id: $pod_doc_id, query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        user_name
        user_email
        total
        currency_symbol
        status
        gateway
        paid_at
        created_at
      }
    }
  }
`);

/** What guests scored this pod on, part by part, plus the ratings themselves. */
export const ClubAdminPodFeedbackDocument = gql(`
  query MobileClubAdminPodFeedback($pod_doc_id: ID!) {
    clubAdminPodFeedback(pod_doc_id: $pod_doc_id) {
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
  }
`);
