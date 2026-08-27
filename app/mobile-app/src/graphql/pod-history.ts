import { gql } from '@/generated/graphql';

/**
 * The signed-in user's pod memberships — RN port of mWeb's MY_POD_MEMBERSHIPS.
 * Backs both the Pod History list and the membership details screen.
 */
export const MyPodMembershipsDocument = gql(`
  query MobileMyPodMemberships {
    myPodMemberships {
      id
      pod_id
      status
      seats
      joined_at
      backed_out_at
      payment_id
      refund_status
      refund_payment_id
      referral_token
      source
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
          coins_refunded
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
      pod {
        id
        pod_id
        club_slug
        pod_title
        pod_date_time
        pod_end_date_time
        pod_amount
        pod_type
        is_deleted
        no_of_spots
        pod_images_and_videos {
          url
          type
        }
        club {
          id
          category_id
          super_category_id
        }
      }
    }
  }
`);

/** Super + Category tree for the Pod History filter (For You / For Your Pet → Sports …). */
export const PodHistoryCategoriesDocument = gql(`
  query MobilePodHistoryCategories {
    categories {
      id
      name
      level
      parent_id
    }
  }
`);

/**
 * How many Backout attempts this booking has left, from the same membership
 * state the backout mutation itself guards on — mWeb's POD_HISTORY_BACKOUT_STATE.
 *
 * Asked rather than counted from `participation.backouts`: the server counts
 * every request this user raised on this POD, and re-booking a pod after a
 * replacement took the seat starts a fresh membership whose own list is empty.
 */
export const PodBackoutStateDocument = gql(`
  query MobilePodBackoutState($pod_doc_id: ID!) {
    podMembershipState(pod_doc_id: $pod_doc_id) {
      pod_id
      backout_attempts_used
      backout_attempts_max
    }
  }
`);

/** Back out of a joined pod — mWeb's BACKOUT_POD_HISTORY. */
export const BackoutPodDocument = gql(`
  mutation MobileBackoutPod($pod_doc_id: ID!, $seats: Int) {
    backoutPod(pod_doc_id: $pod_doc_id, seats: $seats) {
      id
      status
      seats
      backed_out_at
      refund_status
      refund_payment_id
      referral_token
    }
  }
`);

/** Rejoin a backed-out pod for free — mWeb's REJOIN_POD. */
export const RejoinPodDocument = gql(`
  mutation MobileRejoinPod($pod_doc_id: ID!) {
    rejoinPod(pod_doc_id: $pod_doc_id) {
      id
      status
      backed_out_at
      refund_status
      refund_payment_id
      referral_token
    }
  }
`);

/** Keep My Spot — cancel an in-process backout and restore the booking. */
export const CancelBackoutPodDocument = gql(`
  mutation MobileCancelBackoutPod($pod_doc_id: ID!) {
    cancelBackoutPod(pod_doc_id: $pod_doc_id) {
      id
      status
      seats
      backed_out_at
      refund_status
    }
  }
`);

/** Global backout deduction % (Finance → Default Deductions → Backouts) for the
 * "finding your replacement" refund note. Public settings. */
export const BackoutDeductionDocument = gql(`
  query MobileBackoutDeduction {
    publicFinanceSettings {
      default_backout_deduction_pct
    }
  }
`);

/** Base64 PDF invoice for a payment — mWeb's POD_HISTORY_INVOICE_PDF. */
export const PodInvoicePdfDocument = gql(`
  query MobilePodInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`);

/** The current user's event ticket for a pod (id + code for download). */
export const MyEventTicketForPodDocument = gql(`
  query MobileMyEventTicketForPod($podId: ID!) {
    myEventTicketForPod(pod_doc_id: $podId) {
      id
      ticket_code
    }
  }
`);

/** Base64 PDF for an event ticket. */
export const EventTicketPdfDocument = gql(`
  query MobileEventTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`);
