export const analyticsTypeDefs = /* GraphQL */ `
  enum AnalyticsGranularity {
    DAY
    WEEK
    MONTH
  }

  enum AppAnalyticsEventType {
    PAGE_VIEW
    IMPRESSION
    CLICK
    TOUCH
  }

  type ActiveUserBucket {
    bucket: String!
    unique_devices: Int!
    unique_users: Int!
  }

  type ActiveUserStats {
    granularity: AnalyticsGranularity!
    from: String!
    to: String!
    total_unique_devices: Int!
    total_unique_users: Int!
    buckets: [ActiveUserBucket!]!
  }

  type UserActivityDay {
    date: String!
    count: Int!
    level: Int!
  }

  type UserActivityYear {
    user_id: ID!
    year: Int!
    available_years: [Int!]!
    total_visits: Int!
    days: [UserActivityDay!]!
  }

  type AppAnalyticsEvent {
    id: ID!
    user_id: ID!
    device_id: String!
    event_type: AppAnalyticsEventType!
    client_event_id: String!
    path: String!
    route: String!
    title: String!
    target_tag: String!
    target_text: String!
    target_label: String!
    target_role: String!
    target_href: String!
    super_category_slug: String
    pod_id: ID
    checkout_url: String!
    metadata_json: String!
    occurred_at: String!
  }

  input RecordAppEventInput {
    event_type: AppAnalyticsEventType!
    client_event_id: String
    path: String!
    route: String
    title: String
    target_tag: String
    target_text: String
    target_label: String
    target_role: String
    target_href: String
    super_category_slug: String
    pod_id: ID
    checkout_url: String
    metadata_json: String
    occurred_at: String
  }

  type SuperCategoryCount {
    super_category_slug: String
    super_category_name: String
    count: Int!
  }

  type DashboardTotals {
    pods: [SuperCategoryCount!]!
    clubs: [SuperCategoryCount!]!
    users_total: Int!
    pods_total: Int!
    clubs_total: Int!
    venues_total: Int!
    hosts_total: Int!
    support_tickets_open: Int!
    support_tickets_total: Int!
    support_tickets_by_status: [StatusCount!]!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  extend type Query {
    activeUserStats(
      from: String!
      to: String!
      granularity: AnalyticsGranularity
      super_category_slug: String
    ): ActiveUserStats!
    userActivityYear(user_id: ID!, year: Int): UserActivityYear!
    userClickstream(user_id: ID!, date: String!, limit: Int): [AppAnalyticsEvent!]!
    dashboardTotals(super_category_slug: String): DashboardTotals!
  }

  extend type Mutation {
    recordActivePing(super_category_slug: String): Boolean!
    recordAppEvent(input: RecordAppEventInput!): Boolean!
    deleteUserActivityDay(user_id: ID!, date: String!): Boolean!
    deleteUserActivityYear(user_id: ID!, year: Int!): Boolean!
  }
`;
