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

/** Row shape shared by the clubs table and the deep-link edit fetch. */
export interface ClubRow {
  id: string;
  club_id: string;
  club_name: string;
  club_feature_images_and_videos?: { url: string; type: string }[] | null;
  club_whats_app_community_link?: string | null;
  club_whats_app_group_link?: string | null;
  locality?: string | null;
  matched_venues_count?: number | null;
  category_id?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

/** Same selection as CLUBS rows (+ created_at for the table's Created column),
 * so table rows can feed the edit dialog without a second fetch. */
const CLUB_ROW_FIELDS = gql`
  fragment ClubRowFields on Club {
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
    created_at
    updated_at
  }
`;

export const CLUBS_TABLE = gql`
  query ClubsTable($query: TableQueryInput) {
    clubsTable(query: $query) {
      total
      rows {
        ...ClubRowFields
      }
    }
  }
  ${CLUB_ROW_FIELDS}
`;

/** Single-club fetch for the /clubs?edit=<id> deep-link (rows are paged now). */
export const CLUB_FOR_EDIT = gql`
  query ClubForEdit($id: ID!) {
    club(club_doc_id: $id) {
      ...ClubRowFields
    }
  }
  ${CLUB_ROW_FIELDS}
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
