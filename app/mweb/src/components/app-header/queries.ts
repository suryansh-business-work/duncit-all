import { gql } from '@apollo/client';

export const HEADER_DATA = gql`
  query AppHeader {
    branding {
      app_name
      logo_url
      mweb_logo_url
      primary_color
      mascot_name
      mascot_description_html
      mascot_image_url
      mascot_lottie_url
      app_loader_lottie_url
      confetti_lottie_url
      welcome_lottie_url
    }
    me {
      user_id
      full_name
      first_name
      email
      is_email_verified
      profile_photo
      city
      selected_location_id
      roles
      following_pod_ids
      following_user_ids
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
      city
      state
      state_code
      country
      country_code
      location_pincode
      location_zones {
        zone_name
        pincode
      }
    }
    activePodLocationIds
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

/** Persist the user's selected header location so it sticks across sessions. */
export const SET_MY_SELECTED_LOCATION = gql`
  mutation SetMySelectedLocation($locationId: ID) {
    setMySelectedLocation(location_id: $locationId) {
      user_id
      selected_location_id
    }
  }
`;

/** Dispatched on `window` when the header logo is tapped while already on Home,
 * so the home feed can re-fetch (a logo tap should refresh, not no-op). */
export const HOME_REFRESH_EVENT = 'duncit:home-refresh';

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
