import { gql } from '@apollo/client';

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
      id
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
