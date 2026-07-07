import { gql } from '@apollo/client';

export const CLUBS = gql`
  query Clubs($filter: ClubFilterInput) {
    clubs(filter: $filter) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_group_link
      club_moments {
        url
        type
      }
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
      location_id
      locality
      matched_venues_count
      category_id
      super_category_id
      admin_user_ids
      club_admins {
        id
        name
        avatar_url
      }
      is_verified
      is_active
      updated_at
    }
  }
`;

export const CATEGORIES = gql`
  query AllCategories {
    categories {
      id
      name
      level
      parent_id
    }
  }
`;

export const CREATE = gql`
  mutation CreateClub($input: CreateClubInput!) {
    createClub(input: $input) {
      id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdateClub($id: ID!, $input: UpdateClubInput!) {
    updateClub(club_doc_id: $id, input: $input) {
      id
    }
  }
`;
export const DELETE = gql`
  mutation DeleteClub($id: ID!) {
    deleteClub(club_doc_id: $id)
  }
`;
