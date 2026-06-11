import { gql } from '@/generated/graphql';

/** Server-side pod search for the header Search screen — same filter the mWeb
 * header search uses (`pods(filter: { search })`), so results match across apps. */
export const PodSearchDocument = gql(`
  query MobilePodSearch($filter: PodFilterInput) {
    pods(filter: $filter) {
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
