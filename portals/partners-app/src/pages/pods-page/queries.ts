import { gql } from '@apollo/client';

export const PARTNER_PODS_PAGE = gql`
  query PartnerPodsPage {
    myHost { id status }
    clubs(filter: { is_active: true }) { id club_name meetup_venues_id }
    myVenues { id venue_name city locality status is_active }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
      listing_review_status
    }
    myHostPods {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
      club_id
      venue_id
      pod_mode
      pod_date_time
      pod_amount
      pod_attendees
      is_active
      completed_at
    }
  }
`;

export const CREATE_PARTNER_POD = gql`
  mutation CreatePartnerPod($input: CreatePodInput!) {
    createPartnerPod(input: $input) { id }
  }
`;

export const HOST_UPDATE_POD = gql`
  mutation PartnerHostUpdatePod($pod_doc_id: ID!, $input: HostUpdatePodInput!) {
    hostUpdatePod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
    }
  }
`;