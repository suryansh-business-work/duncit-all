import { gql } from '@apollo/client';

export const HOME_DATA = gql`
  query HomeFeed($locId: ID, $podFilter: PodFilterInput) {
    sliders(filter: { location_id: $locId, is_active: true }) {
      id
      title
      description
      media_url
      media_type
      link_url
      scope
      sort_order
    }
    globalSliders: sliders(filter: { scope: GLOBAL, is_active: true }) {
      id
      title
      description
      media_url
      media_type
      link_url
      scope
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
      pod_images_and_videos {
        url
        type
      }
      club_id
      location_id
      zone_name
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
