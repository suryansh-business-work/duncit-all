import { gql } from '@/generated/graphql';

/**
 * The signed-in user's notifications + unread count — RN port of mWeb's
 * MY_NOTIFS. Backs the header bell badge and the full-screen notifications list.
 */
export const MobileNotificationsDocument = gql(`
  query MobileNotifications {
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
`);

/** Mark a single notification read — mWeb's MARK_READ. */
export const MobileMarkNotificationReadDocument = gql(`
  mutation MobileMarkNotificationRead($id: ID!) {
    markNotificationRead(user_notification_doc_id: $id)
  }
`);

/** Mark every notification read — mWeb's MARK_ALL. */
export const MobileMarkAllNotificationsReadDocument = gql(`
  mutation MobileMarkAllNotificationsRead {
    markAllNotificationsRead
  }
`);
