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
    "A named product event that is neither a view nor a click (app_open, search_performed); event_name says which."
    EVENT
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

  """
  One product-analytics event from mWeb or the native app. event_name follows the snake_case
  taxonomy (screen_view, element_click, app_open, app_background, search_performed, …).
  On a screen_view, duration_ms is the foreground time spent on previous_screen; on an
  app_background it is the time spent on screen_name. Text is redacted again on the server.
  """
  input AppEventInput {
    event_name: String!
    "Made on the device; a batch resent with the same ids stores nothing twice."
    client_event_id: String!
    "The app session: a new one after 30 minutes without activity."
    session_id: String!
    "ISO 8601, by the device's clock."
    occurred_at: String!
    "ios, android, web (the native app's web build) or mweb."
    platform: String
    app_version: String
    os_version: String
    "phone, tablet or desktop."
    device_type: String
    screen_name: String
    previous_screen: String
    path: String
    title: String
    element_id: String
    element_type: String
    element_name: String
    element_text: String
    target_href: String
    duration_ms: Int
    super_category_slug: String
    pod_id: ID
    "A flat JSON object of extra properties; sensitive names are dropped and text is redacted."
    properties_json: String
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
    "Stores a batch of up to 50 product-analytics events; answers how many were new. Needs the analytics consent; works signed out."
    recordAppEvents(events: [AppEventInput!]!): Int!
    deleteUserActivityDay(user_id: ID!, date: String!): Boolean!
    deleteUserActivityYear(user_id: ID!, year: Int!): Boolean!
  }
`;
