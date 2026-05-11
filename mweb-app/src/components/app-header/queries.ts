import { gql } from '@apollo/client';

export const HEADER_DATA = gql`
  query AppHeader {
    branding {
      app_name
      logo_url
      primary_color
    }
    me {
      user_id
      full_name
      first_name
      email
      profile_photo
      city
      roles
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      name
      slug
      icon
    }
    locations {
      id
      location_id
      location_name
      location_image
      location_zones {
        zone_name
      }
    }
  }
`;

export const POD_SEARCH = gql`
  query PodHeaderSearch($filter: PodFilterInput) {
    pods(filter: $filter) {
      id
      pod_id
      club_slug
      pod_title
      pod_date_time
      no_of_spots
      pod_attendees
      place_label
      place_detail
      pod_images_and_videos {
        url
      }
    }
  }
`;

export const MY_NOTIFS = gql`
  query MyNotifications {
    myNotifications(limit: 30) {
      id
      read_at
      created_at
      notification {
        id
        title
        body
        image_url
        link_url
        created_at
      }
    }
    myUnreadNotificationCount
  }
`;

export const MARK_READ = gql`
  mutation MarkRead($id: ID!) {
    markNotificationRead(user_notification_doc_id: $id)
  }
`;

export const MARK_ALL = gql`
  mutation MarkAllRead {
    markAllNotificationsRead
  }
`;

export const PUBLIC_POLICIES = gql`
  query PublicPoliciesNav {
    publicPolicies {
      id
      slug
      title
    }
  }
`;

export const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};
