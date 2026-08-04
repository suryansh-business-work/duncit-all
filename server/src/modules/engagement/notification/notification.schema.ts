export const notificationTypeDefs = /* GraphQL */ `
  enum NotificationScope {
    GLOBAL
    LOCATION
    ZONE
    USER
    "Everybody currently matching a saved marketing audience list."
    AUDIENCE_LIST
  }

  """
  Notifications the recipient can act on inline. FOLLOW_REQUEST renders
  Accept / Reject against the FollowRequest in action_ref_id.
  """
  enum NotificationAction {
    FOLLOW_REQUEST
  }

  type Notification {
    id: ID!
    title: String!
    body: String!
    image_url: String
    link_url: String
    "Set when this row carries inline actions instead of only being readable."
    action_type: NotificationAction
    "The document the actions operate on — a FollowRequest id for FOLLOW_REQUEST."
    action_ref_id: ID
    "Live status of action_ref_id, so an answered request stops offering buttons."
    action_status: String
    scope: NotificationScope!
    silent: Boolean!
    location_id: ID
    zone_name: String
    target_user_ids: [ID!]!
    "AUDIENCE_LIST scope only — members are recomputed at send time."
    audience_list_id: ID
    sent_by: ID
    delivered_count: Int!
    failed_count: Int!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (notificationsTable)."
  type NotificationTablePage {
    rows: [Notification!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type UserNotification {
    id: ID!
    notification: Notification!
    read_at: String
    created_at: String!
  }

  type PushConfig {
    publicKey: String!
  }

  input CreateNotificationInput {
    title: String!
    body: String!
    image_url: String
    link_url: String
    scope: NotificationScope!
    silent: Boolean
    location_id: ID
    zone_name: String
    target_user_ids: [ID!]
    "Required for AUDIENCE_LIST scope — the saved marketing list to send to."
    audience_list_id: ID
  }

  input PushSubscriptionInput {
    endpoint: String!
    p256dh: String!
    auth: String!
    user_agent: String
  }

  extend type Query {
    notifications(limit: Int): [Notification!]!
    notificationsTable(query: TableQueryInput): NotificationTablePage!
    myNotifications(limit: Int, unreadOnly: Boolean): [UserNotification!]!
    myUnreadNotificationCount: Int!
    pushConfig: PushConfig!
  }

  extend type Mutation {
    createNotification(input: CreateNotificationInput!): Notification!
    deleteNotification(notification_doc_id: ID!): Boolean!
    savePushSubscription(input: PushSubscriptionInput!): Boolean!
    deletePushSubscription(endpoint: String!): Boolean!
    "Register a native (Expo) push token for the signed-in device."
    saveExpoPushToken(token: String!, platform: String): Boolean!
    deleteExpoPushToken(token: String!): Boolean!
    markNotificationRead(user_notification_doc_id: ID!): Boolean!
    markAllNotificationsRead: Boolean!
  }
`;
