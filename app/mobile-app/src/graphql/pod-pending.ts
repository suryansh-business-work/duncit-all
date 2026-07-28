import { gql } from '@/generated/graphql';

/** Everything the post-create waiting screen renders — the pod summary, the
 * venue contact card (slot decision) and the club admin "need help" card.
 * Host-only on the server (venue/admin contacts are PII). */
export const HostPodPendingViewDocument = gql(`
  query MobileHostPodPendingView($pod_doc_id: ID!) {
    hostPodPendingView(pod_doc_id: $pod_doc_id) {
      pod {
        id
        pod_title
        pod_images_and_videos {
          url
          type
        }
        pod_date_time
        pod_end_date_time
        place_label
        place_detail
        venue_approval_status
      }
      category_name
      expected_earnings
      currency_symbol
      venue {
        venue_id
        venue_name
        contact_person
        phone
        email
        address
        lat
        lng
      }
      club_admin {
        user_id
        name
        profile_photo
        phone
        whatsapp
        email
      }
    }
  }
`);
