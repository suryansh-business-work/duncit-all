import { gql } from '@apollo/client';

export const EXPLORE_PODS = gql`
  query ExplorePods {
    me {
      user_id
      saved_pod_ids
    }
    pods(filter: { is_active: true, has_reel: true }) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      zone_name
      reel_url
      club_id
      club_slug
      location_id
      pod_mode
      venue_id
      place_label
      place_detail
      like_count
      liked_by_me
      liked_user_ids
      comment_count
    }
    clubs(filter: { is_active: true }) {
      id
      club_id
      club_name
      is_verified
      super_category_id
      category_id
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    categories {
      id
      name
      slug
      level
      parent_id
    }
    locations {
      id
      location_name
    }
  }
`;

/** Resolves a pod's likers to public users for the "who liked" list (item 8). */
export const POD_LIKERS = gql`
  query PodLikers($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      first_name
      username
      profile_photo
    }
  }
`;

export const TOGGLE_SAVED_POD = gql`
  mutation ToggleSavedPod($pod_doc_id: ID!) {
    toggleSavedPod(pod_doc_id: $pod_doc_id) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`;
