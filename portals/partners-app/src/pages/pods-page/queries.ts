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