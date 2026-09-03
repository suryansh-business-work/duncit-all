import { gql } from '@apollo/client';

/** The club as the club-admin edit form prefills it (the public `club` query).
 * Its own operation name — the Partners console's copy is `ClubForEdit`. */
export const MWEB_CLUB_FOR_EDIT = gql`
  query MwebClubForEdit($club_doc_id: ID!) {
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
      is_verified
      is_active
    }
  }
`;

/** Edit a club the signed-in user administers — governance fields are ignored server-side. */
export const MWEB_CLUB_ADMIN_UPDATE_CLUB = gql`
  mutation MwebClubAdminUpdateClub($club_doc_id: ID!, $input: UpdateClubInput!) {
    clubAdminUpdateClub(club_doc_id: $club_doc_id, input: $input) {
      id
    }
  }
`;
