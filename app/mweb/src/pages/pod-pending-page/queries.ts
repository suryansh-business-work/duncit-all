import { gql } from '@apollo/client';

/** Everything the post-create waiting screen renders — the pod summary, the
 * venue contact card (slot decision) and the club admin "need help" card.
 * Host-only on the server (venue/admin contacts are PII). Native twin lives in
 * app/mobile-app/src/graphql/pod-pending.ts (rule 27). */
export const HOST_POD_PENDING_VIEW = gql`
  query HostPodPendingView($pod_doc_id: ID!) {
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
`;

export interface PendingMedia {
  url: string;
  type: string;
}

export interface PodPendingVenue {
  venue_id: string;
  venue_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PodPendingClubAdmin {
  user_id: string;
  name: string;
  profile_photo: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

export interface PodPendingView {
  pod: {
    id: string;
    pod_title: string;
    pod_images_and_videos: PendingMedia[];
    pod_date_time: string | null;
    pod_end_date_time: string | null;
    place_label: string | null;
    place_detail: string | null;
    venue_approval_status: string;
  };
  category_name: string;
  expected_earnings: number;
  currency_symbol: string;
  venue: PodPendingVenue | null;
  club_admin: PodPendingClubAdmin | null;
}
