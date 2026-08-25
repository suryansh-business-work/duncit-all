import { gql } from '@/generated/graphql';

/**
 * Home-feed data, fetched as TWO documents — the mobile counterpart of mWeb's
 * HOME_STATIC / HOME_LIVE (rule 27: the two surfaces stay identical).
 *
 * The server's Redis response cache only serves a request when EVERY top-level
 * field it selects is on the public whitelist. `clubs` and `categories` are;
 * `pods` deliberately is not, because seats and stock must never be served
 * stale. Asking for all three in one document therefore made the whole thing
 * uncacheable, so the catalogue half went to Mongo on every launch for nothing.
 *
 * Split, the catalogue is a cache hit and only the pods reach the database. The
 * store merges the two halves back into one object, so every derivation in
 * `useHomeFeed` is unchanged.
 */
export const HomeStaticDocument = gql(`
  query MobileHomeStatic {
    categories {
      id
      name
      slug
      icon
      level
      parent_id
      icon_layout_native {
        position
        width
        height
      }
    }
    clubs(filter: { is_active: true }) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      category_id
      super_category_id
      location_id
      locality
      followers_count
      is_verified
    }
  }
`);

/** The half that must be live: seats move between one launch and the next. */
export const HomePodsDocument = gql(`
  query MobileHomePods($podFilter: PodFilterInput) {
    pods(filter: $podFilter) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      no_of_spots
      pod_attendees
      seats_taken
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
    }
  }
`);
