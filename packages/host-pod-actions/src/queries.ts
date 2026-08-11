import { gql } from '@apollo/client';

/** Host self-service edit — only title, images and description. */
export const HOST_UPDATE_POD = gql`
  mutation HostUpdatePod($pod_doc_id: ID!, $input: HostUpdatePodInput!) {
    hostUpdatePod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

/** What cancelling a pod means for its audience — drives the cancel dialog. */
export const HOST_POD_DELETE_IMPACT = gql`
  query HostPodDeleteImpact($pod_doc_id: ID!) {
    hostPodDeleteImpact(pod_doc_id: $pod_doc_id) {
      other_attendee_count
      refundable_payment_count
      refund_total
      currency_symbol
    }
  }
`;

/** Host cancel with a mandatory reason; the server refunds + emails the audience. */
export const HOST_DELETE_POD = gql`
  mutation HostDeletePod($pod_doc_id: ID!, $reason_subject: String!, $reason_note: String) {
    hostDeletePod(
      pod_doc_id: $pod_doc_id
      reason_subject: $reason_subject
      reason_note: $reason_note
    )
  }
`;

/** Live money waterfall for the pod being completed, at the entered bill amount. */
export const POD_SETTLEMENT_PREVIEW = gql`
  query HostPodSettlementPreview($pod_id: ID!, $venue_bill_amount: Float!) {
    podSettlementPreview(pod_id: $pod_id, venue_bill_amount: $venue_bill_amount) {
      currency_symbol
      collected_total
      has_venue
      paying_attendees
      attended_seats
      booked_seats
      attended_total
      attendees {
        membership_id
        user_id
        name
        seats
        attended
        attended_at
        amount
      }
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

/** Completing a pod: creates the payout releases Finance settles. */
export const COMPLETE_POD = gql`
  mutation HostCompletePodSettlement($input: CompletePodInput!) {
    completePodSettlement(input: $input) {
      settlement {
        currency_symbol
        host {
          payout_amount
        }
      }
      releases {
        id
        kind
        status
      }
    }
  }
`;

/** Venues a rejected pod can be resubmitted to. */
export const RESUBMIT_VENUES = gql`
  query HostResubmitVenues {
    publicVenues {
      id
      venue_name
      city
    }
  }
`;

/** Bookable slots at the venue picked for the resubmission. */
export const RESUBMIT_VENUE_SLOTS = gql`
  query HostResubmitVenueSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      price
      space_label
    }
  }
`;

/** Full edit + resubmission of a venue-rejected pod — the same pod is reused. */
export const HOST_RESUBMIT_POD = gql`
  mutation HostResubmitPod($pod_doc_id: ID!, $input: HostResubmitPodInput!) {
    hostResubmitPod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      venue_approval_status
      is_active
    }
  }
`;

/** Door check-in: marks attendance and answers with who walked in. */
export const HOST_SCAN_POD_TICKET = gql`
  mutation HostScanPodTicket(
    $pod_doc_id: ID!
    $token: String!
    $companions: [PodCompanionInput!]
  ) {
    hostScanPodTicket(pod_doc_id: $pod_doc_id, token: $token, companions: $companions) {
      ok
      message
      already_checked_in
      requires_companions
      companions_required
      ticket {
        id
        ticket_code
        status
        seats
        checked_in_at
      }
      attendee {
        user_id
        full_name
        profile_photo
        profile_path
        email
        phone
        whatsapp
        bio
        address
        city
        joined_at
      }
    }
  }
`;
