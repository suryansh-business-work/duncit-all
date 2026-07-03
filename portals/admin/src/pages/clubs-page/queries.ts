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
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
      location_id
      matched_venues_count
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
export const LOCATIONS = gql`
  query LocationsForClubs {
    locations {
      id
      location_name
      city
      state
    }
  }
`;
/** APPROVED, active venues that auto-match a club by location + Super/Sub
 * category — shown read-only in the Club form so admins see the live linkage. */
export const MATCHING_VENUES = gql`
  query MatchingVenuesForClub($location_id: ID!, $super_category_id: ID, $category_id: ID) {
    matchingVenues(
      location_id: $location_id
      super_category_id: $super_category_id
      category_id: $category_id
    ) {
      id
      venue_name
      locality
      city
      state
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

export interface ClubFaq {
  question: string;
  answer: string;
}

export interface ClubForm {
  id?: string;
  club_id: string;
  club_name: string;
  club_description: string;
  category_id: string;
  super_category_id: string;
  location_id: string;
  feature_text: string;
  moments_text: string;
  community_link: string;
  announcement_link: string;
  group_link: string;
  who_we_are: string[];
  what_we_do: string[];
  perks: string[];
  values: string[];
  faqs: ClubFaq[];
  is_active: boolean;
}
export const blankForm: ClubForm = {
  club_id: '',
  club_name: '',
  club_description: '',
  category_id: '',
  super_category_id: '',
  location_id: '',
  feature_text: '',
  moments_text: '',
  community_link: '',
  announcement_link: '',
  group_link: '',
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  is_active: true,
};

export const linesToMedia = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

export const cleanBullets = (items: string[]) =>
  items.map((item) => item.trim()).filter(Boolean);

export const cleanFaqs = (items: ClubFaq[]) =>
  items
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
    .filter((faq) => faq.question && faq.answer);
