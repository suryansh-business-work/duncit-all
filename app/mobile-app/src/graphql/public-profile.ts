import { gql } from '@/generated/graphql';

/** A user's public profile + the viewer id (to detect "is me") — mWeb's PUBLIC_PROFILE. */
export const MobilePublicProfileDocument = gql(`
  query MobilePublicProfile($user_id: ID!) {
    publicUserProfile(user_id: $user_id) {
      user_id
      username
      full_name
      first_name
      last_name
      profile_photo
      bio
      city
      zone
      followers_count
      following_count
      is_private
      is_following
      follow_status
      follows_viewer
      inbound_request_id
      can_view_content
    }
    me {
      user_id
      following_user_ids
      requested_user_ids
    }
  }
`);

/** A member's permanent posts + active stories for their public profile. The
 * server returns empty lists when the viewer may not see a private account. */
export const MobilePublicUserPostsDocument = gql(`
  query MobilePublicUserPosts($user_id: ID!) {
    posts(author_id: $user_id) {
      id
      image_url
      caption
    }
    stories(author_id: $user_id) {
      id
      image_url
      media_type
      caption
      created_at
      expires_at
      seen_by_me
    }
  }
`);

/** Badges awarded to a user — mWeb's USER_BADGES. */
export const MobileUserBadgesDocument = gql(`
  query MobileUserBadges($user_id: ID!) {
    userBadges(user_id: $user_id) {
      id
      awarded_at
      awarded_reason
      badge {
        id
        title
        description
        image_url
        condition_type
        threshold
      }
    }
  }
`);
