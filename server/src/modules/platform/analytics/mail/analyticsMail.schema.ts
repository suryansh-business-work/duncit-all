export const analyticsMailTypeDefs = /* GraphQL */ `
  "How often a subscriber's analytics report goes out."
  enum AnalyticsMailFrequency {
    DAILY
    WEEKLY
  }

  "When analytics reports go out. The time is wall-clock in the platform's own time zone."
  type AnalyticsMailSettings {
    enabled: Boolean!
    "HH:mm"
    time_of_day: String!
    "0-6, Sunday first. Read only for weekly subscribers."
    weekday: Int!
    "The zone time_of_day is read in (Admin > Settings)."
    time_zone: String!
  }

  input AnalyticsMailSettingsInput {
    enabled: Boolean!
    time_of_day: String!
    weekday: Int!
  }

  "Somebody who receives the Analytics console's numbers by email, with the PDF attached."
  type AnalyticsMailSubscription {
    id: ID!
    name: String!
    email: String!
    "The dashboards the report covers, in sidebar order."
    pages: [AnalyticsEntity!]!
    frequency: AnalyticsMailFrequency!
    "The reporting period in days: 7, 30, 90 or 365."
    days: Int!
    is_active: Boolean!
    last_sent_at: String
    "SENT, FAILED or SKIPPED."
    last_status: String
    last_error: String
    "Null while sending is off or this subscriber is paused."
    next_send_at: String
    created_at: String!
  }

  input AnalyticsMailSubscriptionInput {
    name: String!
    email: String!
    pages: [AnalyticsEntity!]!
    frequency: AnalyticsMailFrequency!
    days: Int!
    is_active: Boolean!
  }

  type AnalyticsMailSendResult {
    ok: Boolean!
    "Why it did not go, when it did not."
    message: String!
  }

  extend type Query {
    analyticsMailSettings: AnalyticsMailSettings!
    analyticsMailSubscriptions: [AnalyticsMailSubscription!]!
  }

  extend type Mutation {
    updateAnalyticsMailSettings(input: AnalyticsMailSettingsInput!): AnalyticsMailSettings!
    createAnalyticsMailSubscription(input: AnalyticsMailSubscriptionInput!): AnalyticsMailSubscription!
    updateAnalyticsMailSubscription(id: ID!, input: AnalyticsMailSubscriptionInput!): AnalyticsMailSubscription!
    deleteAnalyticsMailSubscription(id: ID!): Boolean!
    "Build and send one subscriber's report now, whatever the schedule says."
    sendAnalyticsMailNow(id: ID!): AnalyticsMailSendResult!
  }
`;
