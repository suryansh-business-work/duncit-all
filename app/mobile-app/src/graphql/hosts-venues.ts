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

/** Location-scoped venues for the Venues page — server-side search (client
 * debounces) + Super→Cat→Sub category filter. mWeb's VENUES_EXPLORE twin. */
export const MobileVenuesDocument = gql(`
  query MobileVenues($location_id: ID, $search: String, $super_category_id: ID, $category_id: ID, $sub_category_id: ID) {
    publicVenues(location_id: $location_id, search: $search, super_category_id: $super_category_id, category_id: $category_id, sub_category_id: $sub_category_id) {
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
      pod_count
      venue_category {
        super_category_name
        category_name
        sub_category_name
      }
    }
  }
`);

/** All live pods hosted at a venue — the venue-detail "Pods at this venue"
 * section (same selection as the club-detail pods). */
export const MobileVenuePodsDocument = gql(`
  query MobileVenueHostedPods($venueId: ID!) {
    pods(filter: { venue_id: $venueId, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
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
      pod_mode
      place_label
      place_detail
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
