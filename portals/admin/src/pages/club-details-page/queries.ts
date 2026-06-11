import { gql } from '@apollo/client';

export const CLUB_DETAIL = gql`
  query AdminClubDetail($id: ID!) {
    club(club_doc_id: $id) {
      id
      club_id
      club_name
      club_description
      category_id
      super_category_id
      club_whats_app_community_link
      club_whats_app_group_link
      is_active
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
    }
    pods(filter: { club_id: $id }) {
      id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      is_active
    }
  }
`;
