import { gql } from '@apollo/client';

export const HOME_DATA = gql`
  query HomeFeed($podFilter: PodFilterInput) {
    clubs(filter: { is_active: true }) {
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
      category_id
      super_category_id
    }
    pods(filter: $podFilter) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      pod_hosts_id
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      location_id
      zone_name
      place_label
      place_detail
    }
    publicHosts {
      user_id
      full_name
    }
    stories {
      id
      author_id
      image_url
      media_type
      caption
      created_at
      expires_at
      seen_by_me
      liked_by_me
      likes_count
      views_count
    }
    categories {
      id
      name
      slug
      icon
      level
      parent_id
    }
  }
`;

export const FOLLOWED_USERS = gql`
  query HomeFollowedUsers($userIds: [ID!]!) {
    publicUsersByIds(user_ids: $userIds) {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

/** Record that the viewer opened a story — greys its ring (Bug 2). */
export const RECORD_STORY_VIEW = gql`
  mutation RecordStoryView($id: ID!) {
    recordStoryView(post_doc_id: $id) {
      id
      seen_by_me
      views_count
    }
  }
`;

/** Like/unlike a follower's story (Bug 5). */
export const TOGGLE_STORY_LIKE = gql`
  mutation ToggleStoryLike($id: ID!) {
    togglePostLike(post_doc_id: $id) {
      id
      liked_by_me
      likes_count
    }
  }
`;

/** Owner-only list of who viewed a story, newest first (Bug 4). */
export const STORY_VIEWERS = gql`
  query StoryViewers($id: ID!) {
    storyViewers(post_doc_id: $id) {
      user_id
      viewed_at
      user {
        user_id
        full_name
        profile_photo
      }
    }
  }
`;

/** Delete one of my own stories (Bug 7). */
export const DELETE_STORY_POST = gql`
  mutation DeleteStoryPost($id: ID!) {
    deletePost(post_doc_id: $id)
  }
`;

export type PriceFilter = 'ALL' | 'FREE' | 'PAID' | 'PREMIUM';
export type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type SortBy = 'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC';
