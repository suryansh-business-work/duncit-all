import { gql } from '@apollo/client';
import type { NotifScope } from './helpers';

/** Row shape for the notifications table. */
export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  scope: NotifScope;
  silent: boolean;
  location_id?: string | null;
  zone_name?: string | null;
  target_user_ids: string[];
  delivered_count: number;
  failed_count: number;
  created_at: string;
}

/** Same selection as NOTIFS rows + silent (allowlisted filter field). */
const NOTIFICATION_ROW_FIELDS = gql`
  fragment NotificationRowFields on Notification {
    id
    title
    body
    image_url
    link_url
    scope
    silent
    location_id
    zone_name
    target_user_ids
    delivered_count
    failed_count
    created_at
  }
`;

/** Server-side table page (search/sort/filter/paginate) for the notifications table. */
export const NOTIFS_TABLE = gql`
  query NotificationsTable($query: TableQueryInput) {
    notificationsTable(query: $query) {
      total
      rows {
        ...NotificationRowFields
      }
    }
  }
  ${NOTIFICATION_ROW_FIELDS}
`;

export const NOTIFS = gql`
  query Notifications($limit: Int) {
    notifications(limit: $limit) {
      id
      title
      body
      image_url
      link_url
      scope
      location_id
      zone_name
      target_user_ids
      delivered_count
      failed_count
      created_at
    }
  }
`;

export const LOCATIONS_FOR_NOTIF = gql`
  query LocationsForNotif {
    locations {
      id
      location_name
      location_zones {
        zone_name
      }
    }
  }
`;

export const USERS_FOR_NOTIF = gql`
  query UsersForNotif {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

export const CREATE_NOTIFICATION = gql`
  mutation CreateNotification($input: CreateNotificationInput!) {
    createNotification(input: $input) {
      id
      delivered_count
      failed_count
    }
  }
`;

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(notification_doc_id: $id)
  }
`;
