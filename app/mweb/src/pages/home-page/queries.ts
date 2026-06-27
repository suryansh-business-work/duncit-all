import { gql } from '@apollo/client';

export const HOME_DATA = gql`
  query HomeFeed($podFilter: PodFilterInput, $superCatSlug: String) {
    clubs(filter: { is_active: true }) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
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
      club_slug
      location_id
      zone_name
      place_label
      place_detail
    }
    publicHosts {
      user_id
      full_name
    }
    stories {
      id
      author_id
      image_url
      media_type
      caption
      created_at
      expires_at
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

export const FOLLOWED_USERS = gql`
  query HomeFollowedUsers($userIds: [ID!]!) {
    publicUsersByIds(user_ids: $userIds) {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

export type PriceFilter = 'ALL' | 'FREE' | 'PAID' | 'PREMIUM';
export type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type SortBy = 'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC';
