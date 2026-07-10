import { gql } from '@/generated/graphql';

/**
 * The viewer's saved pods with server-side search + category filter (matches the
 * selected node and its sub-categories) + sort. Selects the same pod fields the
 * shared PodCard needs (mirrors the retired MyPods query). RN twin of mWeb's
 * SAVED_ITEMS.
 */
export const MySavedPodsDocument = gql(`
  query MobileMySavedPods($search: String, $categoryId: ID, $sort: SavedPodSort) {
    mySavedPods(search: $search, category_id: $categoryId, sort: $sort) {
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
      pod_mode
      place_label
      place_detail
    }
  }
`);
