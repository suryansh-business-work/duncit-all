import { gql } from '@apollo/client';

/** Club-centric discovery search — clubs grouped by whether they host a pod in
 * the next 7 days, with follower counts and the viewer's follow state. */
export const SEARCH_DISCOVERY = gql`
  query SearchDiscovery($input: SearchDiscoveryInput) {
    searchDiscovery(input: $input) {
      query
      happening {
        ...SearchClubResultFields
      }
      more_clubs {
        ...SearchClubResultFields
      }
    }
  }
  fragment SearchClubResultFields on SearchClubResult {
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
      club_slug
      pod_title
      pod_date_time
      pod_amount
      pod_type
      no_of_spots
      pod_attendees
      host_names
      place_label
      place_detail
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

/** Type-ahead suggestions as the user types (clubs, categories, pods, activities). */
export const SEARCH_SUGGESTIONS = gql`
  query SearchSuggestions($query: String!) {
    searchSuggestions(query: $query, limit: 8) {
      text
      kind
    }
  }
`;

/** Categories powering the "Discover by Interest" quick buttons and card labels. */
export const SEARCH_CATEGORIES = gql`
  query SearchCategories {
    categories {
      id
      name
      slug
      icon
      level
      parent_id
    }
  }
`;
