import { gql } from '@/generated/graphql';

/** Pods this host runs — same filter mWeb's Host Studio uses, so the two stay
 * identical. Carries description + media for the in-place edit form. */
export const HostPodsDocument = gql(`
  query MobileHostPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_title
      pod_id
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
