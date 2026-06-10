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
      club_whats_app_announcement_link
      club_whats_app_group_link
      club_moments {
        url
        type
      }
      meetup_venues_id
      category_id
      super_category_id
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
export const APPROVED_VENUES = gql`
  query ApprovedVenuesForClubs {
    venues(status: APPROVED) {
      id
      venue_name
      venue_type
      locality
      city
      state
      postal_code
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

export interface ClubForm {
  id?: string;
  club_id: string;
  club_name: string;
  club_description: string;
  category_id: string;
  super_category_id: string;
  feature_text: string;
  moments_text: string;
  meetup_venues_id: string[];
  community_link: string;
  announcement_link: string;
  group_link: string;
  is_active: boolean;
}
export const blankForm: ClubForm = {
  club_id: '',
  club_name: '',
  club_description: '',
  category_id: '',
  super_category_id: '',
  feature_text: '',
  moments_text: '',
  meetup_venues_id: [],
  community_link: '',
  announcement_link: '',
  group_link: '',
  is_active: true,
};

export const linesToMedia = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));
