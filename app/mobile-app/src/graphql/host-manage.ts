import { gql } from '@/generated/graphql';

/** Pods this host runs — the host-scoped query mWeb's Host Studio uses, so the
 * two stay identical. Unlike the public \`pods\` query it also returns pods
 * that are offline awaiting/refused venue approval, which is what lets the
 * screen split them into Requested Pods / Your pods / Rejected Pods. Carries
 * description + media for the in-place edit form, and place_label (the venue
 * name) + created_at (when the slot was asked for) for the two request
 * sections. */
export const HostPodsDocument = gql(`
  query MobileHostPods {
    myHostPods {
      id
      pod_title
      pod_id
      club_id
      club_slug
      pod_date_time
      pod_end_date_time
      pod_description
      pod_images_and_videos {
        url
        type
      }
      pod_amount
      pod_type
      pod_mode
      no_of_spots
      location_id
      venue_id
      zone_name
      place_label
      venue_approval_status
      is_active
      created_at
    }
  }
`);

/** Who runs a pod's club, read on demand when the host opens the club-admin
 * sheet — the pod list stays free of contact details it would otherwise carry
 * for every row. Twin of mWeb's PodClubAdmins (rule 27). */
export const ClubAdminsDocument = gql(`
  query MobileClubAdmins($club_doc_id: ID!) {
    club(club_doc_id: $club_doc_id) {
      id
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
`);

/** Approved partner venues a rejected pod can be resubmitted to. */
export const ResubmitVenuesDocument = gql(`
  query MobileResubmitVenues {
    publicVenues {
      id
      venue_name
      city
    }
  }
`);

/** Full edit + resubmission of a venue-rejected pod — the same pod is reused. */
export const HostResubmitPodDocument = gql(`
  mutation MobileHostResubmitPod($pod_doc_id: ID!, $input: HostResubmitPodInput!) {
    hostResubmitPod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      venue_approval_status
      is_active
    }
  }
`);

/** Host self-service edit — only title, images and description (2A). */
export const HostUpdatePodDocument = gql(`
  mutation MobileHostUpdatePod($pod_doc_id: ID!, $input: HostUpdatePodInput!) {
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
`);

/** What deleting a pod means for its audience — drives the delete dialog (2B). */
export const HostPodDeleteImpactDocument = gql(`
  query MobileHostPodDeleteImpact($pod_doc_id: ID!) {
    hostPodDeleteImpact(pod_doc_id: $pod_doc_id) {
      other_attendee_count
      refundable_payment_count
      refund_total
      currency_symbol
    }
  }
`);

/** Host delete with a mandatory reason; the server refunds + emails the audience. */
export const HostDeletePodDocument = gql(`
  mutation MobileHostDeletePod($pod_doc_id: ID!, $reason_subject: String!, $reason_note: String) {
    hostDeletePod(
      pod_doc_id: $pod_doc_id
      reason_subject: $reason_subject
      reason_note: $reason_note
    )
  }
`);

/** Host scans an attendee's ticket QR at the door: marks attendance and answers
 * with who walked in. Twin of mWeb's HostScanPodTicket (rule 27). */
export const HostScanPodTicketDocument = gql(`
  mutation MobileHostScanPodTicket(
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
      companions {
        name
        phone_number
      }
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
`);
