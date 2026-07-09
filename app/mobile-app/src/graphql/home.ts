import { gql } from '@/generated/graphql';

/**
 * Home-feed data for the authenticated landing — the mobile counterpart of
 * mWeb's `HOME_DATA`. We fetch the active clubs, their pods, and the category
 * tree (for the vibe chips). Heavy client-side price/date/sort filtering stays
 * a follow-up; the shell groups pods by club and surfaces the soonest ones.
 */
export const HomeFeedDocument = gql(`
  query MobileHomeFeed($podFilter: PodFilterInput) {
    categories {
      id
      name
      slug
      icon
      level
      parent_id
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
    }
    pods(filter: $podFilter) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
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
    }
  }
`);
