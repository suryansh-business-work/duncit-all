import { gql } from '@apollo/client';

export const HOME_DATA = gql`
  query HomeFeed($podFilter: PodFilterInput, $superCatSlug: String) {
    sliders(filter: { super_category_slug: $superCatSlug, is_active: true }) {
      id
      title
      description
      media_url
      media_type
      link_type
      link_target_kind
      link_target_slug
      link_target_parent_slug
      link_url
      effective_link_url
      scope
      super_category_slug
      location_id
      zone_name
      sort_order
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      category_id
      super_category_id
    }
    pods(filter: $podFilter) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      pod_hosts_id
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      location_id
      zone_name
      place_label
      place_detail
    }
    publicHosts {
      user_id
      full_name
    }
    categories {
      id
      name
      slug
      level
      parent_id
    }
  }
`;

export type PriceFilter = 'ALL' | 'FREE' | 'PAID' | 'PREMIUM';
export type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type SortBy = 'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC';
