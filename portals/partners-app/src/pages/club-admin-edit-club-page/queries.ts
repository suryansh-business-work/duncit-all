import { gql } from '@apollo/client';

/** Full club fetched for the club-admin edit form prefill (public `club` query). */
export const CLUB_FOR_EDIT = gql`
  query ClubForEdit($club_doc_id: ID!) {
    club(club_doc_id: $club_doc_id) {
      id
      club_id
      club_name
      club_description
      super_category_id
      category_id
      location_id
      locality
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
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
      admin_user_ids
      club_admins {
        id
        name
        avatar_url
      }
      is_verified
      is_active
    }
  }
`;

/** Edit a club the signed-in user administers (governance fields ignored). */
export const CLUB_ADMIN_UPDATE_CLUB = gql`
  mutation ClubAdminUpdateClub($club_doc_id: ID!, $input: UpdateClubInput!) {
    clubAdminUpdateClub(club_doc_id: $club_doc_id, input: $input) {
      id
    }
  }
`;
