export const notificationTypeDefs = /* GraphQL */ `
  enum NotificationScope {
    GLOBAL
    LOCATION
    ZONE
    USER
  }

  type Notification {
    id: ID!
    title: String!
    body: String!
    image_url: String
    link_url: String
    scope: NotificationScope!
    location_id: ID
    zone_name: String
    target_user_ids: [ID!]!
    sent_by: ID
    delivered_count: Int!
    failed_count: Int!
    created_at: String!
    updated_at: String!
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
    location_id: ID
    zone_name: String
    target_user_ids: [ID!]
  }

  input PushSubscriptionInput {
    endpoint: String!
    p256dh: String!
    auth: String!
    user_agent: String
  }

  extend type Query {
    notifications(limit: Int): [Notification!]!
    myNotifications(limit: Int, unreadOnly: Boolean): [UserNotification!]!
    myUnreadNotificationCount: Int!
    pushConfig: PushConfig!
  }

  extend type Mutation {
    createNotification(input: CreateNotificationInput!): Notification!
    deleteNotification(notification_doc_id: ID!): Boolean!
    savePushSubscription(input: PushSubscriptionInput!): Boolean!
    deletePushSubscription(endpoint: String!): Boolean!
    markNotificationRead(user_notification_doc_id: ID!): Boolean!
    markAllNotificationsRead: Boolean!
  }
`;
