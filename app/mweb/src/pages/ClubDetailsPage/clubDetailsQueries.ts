import { gql } from '@apollo/client';

export const CLUB_BY_SLUG = gql`
  query ClubBySlug($slug: String!) {
    clubBySlug(club_slug: $slug) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
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
      club_whats_app_community_link
      club_whats_app_announcement_link
      club_whats_app_group_link
      matched_venues {
        id
        venue_name
        address_line1
        address_line2
        locality
        city
        state
        country
        postal_code
        lat
        lng
      }
      followers_count
      rating
      ratings_count
      hosts {
        id
        name
        avatar_url
      }
      category_id
      super_category_id
    }
  }
`;

export const CLUB_DETAILS_RELATED = gql`
  query ClubDetailsRelated($id: ID!) {
    me {
      user_id
      following_user_ids
    }
    clubPods: pods(filter: { club_id: $id, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      place_label
      place_detail
      club_slug
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export const CLUB_STORIES = gql`
  query ClubStories($id: ID!) {
    clubStories(club_id: $id) {
      id
      image_url
      media_type
      caption
      created_at
      author {
        user_id
        full_name
        profile_photo
      }
    }
  }
`;

/** Resolves category and super-category names for a club (B11). */
export const CLUB_CATEGORY_NAMES = gql`
  query ClubCategoryNames($catId: ID!, $superCatId: ID!) {
    clubCategory: category(category_id: $catId) {
      id
      name
      slug
    }
    clubSuperCategory: category(category_id: $superCatId) {
      id
      name
      slug
    }
  }
`;

export const CLUB_RATINGS = gql`
  query ClubRatings($id: ID!) {
    clubRatings(club_doc_id: $id) {
      id
      user_id
      user_name
      user_photo
      stars
      comment
      created_at
    }
  }
`;

export const ADD_CLUB_RATING = gql`
  mutation AddClubRating($clubId: ID!, $stars: Int!, $comment: String) {
    addClubRating(club_doc_id: $clubId, stars: $stars, comment: $comment) {
      id
      rating
      ratings_count
    }
  }
`;
