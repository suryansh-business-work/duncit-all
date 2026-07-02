import { gql } from '@/generated/graphql';

/** Approved hosts + the viewer's following ids — RN port of mWeb's PUBLIC_HOSTS. */
export const MobilePublicHostsDocument = gql(`
  query MobilePublicHosts {
    me {
      user_id
      following_user_ids
    }
    publicHosts {
      id
      user_id
      full_name
      email
      passport_photo_url
      full_address
      tags
      approved_at
    }
  }
`);

/** Approved venues for the discovery list — RN port of mWeb's PUBLIC_VENUES. */
export const MobilePublicVenuesDocument = gql(`
  query MobilePublicVenues {
    publicVenues {
      id
      owner_user_id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      gallery
      address_line1
      address_line2
      country
      city
      state
      locality
      postal_code
      lat
      lng
      amenities
      facilities
      security
      tags
    }
  }
`);

/** Follow a user (host) — mWeb's FOLLOW_USER. */
export const MobileFollowUserDocument = gql(`
  mutation MobileFollowUser($user_id: ID!) {
    followUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`);

/** Unfollow a user (host) — mWeb's UNFOLLOW_USER. */
export const MobileUnfollowUserDocument = gql(`
  mutation MobileUnfollowUser($user_id: ID!) {
    unfollowUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`);
