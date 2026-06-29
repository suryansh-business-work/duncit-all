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

/** Club-centric discovery search — clubs grouped by whether they host a pod in
 * the next 7 days, with follower counts and the viewer's follow state. Mirrors
 * mWeb's SEARCH_DISCOVERY so both platforms surface identical results. */
export const SearchDiscoveryDocument = gql(`
  query MobileSearchDiscovery($input: SearchDiscoveryInput) {
    searchDiscovery(input: $input) {
      query
      happening {
        is_following
        participant_count
        next_pod_date
        club {
          id
          club_id
          club_name
          club_description
          followers_count
          category_id
          super_category_id
          club_feature_images_and_videos {
            url
            type
          }
        }
        upcoming_pods {
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
          pod_attendees
        }
      }
      more_clubs {
        is_following
        participant_count
        next_pod_date
        club {
          id
          club_id
          club_name
          club_description
          followers_count
          category_id
          super_category_id
          club_feature_images_and_videos {
            url
            type
          }
        }
        upcoming_pods {
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
          pod_attendees
        }
      }
    }
  }
`);

/** Type-ahead suggestions across clubs, categories, pods and activities. */
export const SearchSuggestionsDocument = gql(`
  query MobileSearchSuggestions($query: String!) {
    searchSuggestions(query: $query, limit: 8) {
      text
      kind
    }
  }
`);

/** Categories powering the "Discover by Interest" quick buttons + card labels. */
export const SearchCategoriesDocument = gql(`
  query MobileSearchCategories {
    categories {
      id
      name
      slug
      icon
      level
      parent_id
    }
  }
`);
