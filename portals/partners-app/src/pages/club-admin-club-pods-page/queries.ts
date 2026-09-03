import { gql } from '@apollo/client';

// The club-admin pod editor's documents live in @duncit/pod-form, where mWeb
// mounts the same editor.
export const CLUB_ADMIN_PODS = gql`
  query ClubAdminPods($filter: PodFilterInput) {
    pods(filter: $filter) {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
      club_id
      venue_id
      venue_slot_id
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_hashtag
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_info
      what_this_pod_offers
      available_perks
      payment_terms
      products_enabled
      product_requests { product_id quantity }
      pod_attendees
      attendance { attended_seats booked_seats recorded }
      is_active
      completed_at
    }
  }
`;
