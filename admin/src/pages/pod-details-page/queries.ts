import { gql } from '@apollo/client';

export const POD_DETAIL = gql`
  query AdminPodDetail($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      meeting_url
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_attendees
      pod_hits
      zone_name
      club_id
      club_slug
      location_id
      venue_id
      products_enabled
      like_count
      comment_count
      is_active
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;
