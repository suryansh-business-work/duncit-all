import { gql } from '@/generated/graphql';

/**
 * Reels feed for Explore — every active pod with its media + social counts, the
 * clubs (cover/name) and the viewer's saved set. Mirrors mWeb's EXPLORE_PODS.
 */
export const ExplorePodsDocument = gql(`
  query MobileExplorePods {
    me {
      user_id
      saved_pod_ids
    }
    clubs(filter: { is_active: true }) {
      id
      club_id
      club_name
      is_verified
      super_category_id
      club_feature_images_and_videos {
        url
        type
      }
    }
    pods(filter: { is_active: true }) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      location_id
      pod_mode
      place_label
      place_detail
      zone_name
      like_count
      liked_by_me
      liked_user_ids
      comment_count
    }
  }
`);

/** Resolves a pod's likers to public users for the "who liked" list (item 8). */
export const PodLikersDocument = gql(`
  query MobilePodLikers($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      first_name
      username
      profile_photo
    }
  }
`);

/** Like/unlike a pod — returns the new count + liked state. */
export const TogglePodLikeDocument = gql(`
  mutation MobileTogglePodLike($podDocId: ID!) {
    togglePodLike(pod_doc_id: $podDocId) {
      id
      like_count
      liked_by_me
    }
  }
`);

/** Save/unsave a pod — returns the saved flag + the full saved id list. */
export const ToggleSavedPodDocument = gql(`
  mutation MobileToggleSavedPod($podDocId: ID!) {
    toggleSavedPod(pod_doc_id: $podDocId) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`);
