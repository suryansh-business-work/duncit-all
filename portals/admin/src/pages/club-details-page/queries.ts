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
      is_verified
      is_active
      locality
      followers_count
      matched_venues_count
      rating
      ratings_count
      club_whats_app_community_link
      club_whats_app_group_link
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
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
