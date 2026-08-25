import { gql } from '@apollo/client';

/**
 * The home feed is fetched as TWO documents, not one.
 *
 * The server's Redis response cache only serves a request when EVERY top-level
 * field it selects is on the public whitelist. `clubs`, `publicHosts` and
 * `categories` are all on it — but bundling them with `pods` and `stories`,
 * which are deliberately NOT (seats and stock go stale; a story carries
 * seen_by_me), made the whole document uncacheable. So the catalogue half was
 * re-fetched from Mongo on every single home load for nothing.
 *
 * Split, the slow-moving half is served from cache and only the live half
 * reaches the database. The two are merged back into one object by
 * `useHomeData`, so nothing downstream knows the difference.
 */
export const HOME_STATIC = gql`
  query HomeFeedStatic {
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
      followers_count
      is_verified
      location_id
    }
    publicHosts {
      user_id
      full_name
    }
    categories {
      id
      name
      slug
      icon
      level
      parent_id
      icon_layout_mweb {
        position
        width
        height
      }
    }
  }
`;

/** The half that must be live: seats move, and a story knows who has seen it. */
export const HOME_LIVE = gql`
  query HomeFeedLive($podFilter: PodFilterInput) {
    pods(filter: $podFilter) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      seats_taken
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
    stories {
      id
      author_id
      club_id
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

export type PriceFilter = 'ALL' | 'FREE' | 'PAID';
export type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type SortBy = 'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC';
