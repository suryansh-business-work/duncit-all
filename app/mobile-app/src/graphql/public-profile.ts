import { gql } from '@/generated/graphql';

/** A user's public profile + the viewer id (to detect "is me") — mWeb's PUBLIC_PROFILE. */
export const MobilePublicProfileDocument = gql(`
  query MobilePublicProfile($user_id: ID!) {
    publicUserProfile(user_id: $user_id) {
      user_id
      full_name
      first_name
      last_name
      profile_photo
      bio
      city
      zone
    }
    me {
      user_id
      following_user_ids
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
