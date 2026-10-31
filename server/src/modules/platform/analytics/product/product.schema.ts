export const productAnalyticsTypeDefs = /* GraphQL */ `
  """
  What a Product analytics read covers: a preset length ending now (days, 7-365) or a calendar
  range (from-to, yyyy-MM-dd in the admin zone, inclusive), optionally narrowed to one platform
  (ios, android, web, mweb) and one app version.
  """
  input ProductAnalyticsFilter {
    days: Int
    from: String
    to: String
    platform: String
    app_version: String
  }

  "A named count: a screen, an element, a platform, an event name."
  type ProductCount {
    key: String!
    count: Int!
  }

  """
  One screen of the period. unique_users counts members, plus devices nobody signed in on.
  avg_time_ms is foreground time per view (null when none was reported); exit_rate is the share
  of views that ended a session; bounce_rate the share of sessions that began here and saw nothing else.
  """
  type ProductScreenRow {
    screen_name: String!
    views: Int!
    unique_users: Int!
    avg_time_ms: Float
    total_time_ms: Float!
    entries: Int!
    exits: Int!
    exit_rate: Float!
    bounce_rate: Float!
  }

  type ProductScreenTablePage {
    rows: [ProductScreenRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ProductScreenDetail {
    screen_name: String!
    views: Int!
    avg_time_ms: Float
    "The first calendar day (yyyy-MM-dd) of every bucket, oldest first."
    buckets: [String!]!
    views_series: [Int!]!
    users_series: [Int!]!
    "Where people came from; an empty key is the start of a session."
    previous_screens: [ProductCount!]!
    next_screens: [ProductCount!]!
    "The elements pressed most on this screen."
    elements: [ProductCount!]!
    platforms: [ProductCount!]!
  }

  """
  One element pressed in the period, on one screen. ctr = clicks ÷ views of that screen in the
  same period, as a percentage (null when the screen has no views). repeat_clicks = clicks − unique_users.
  """
  type ProductElementRow {
    key: String!
    element_id: String!
    element_name: String!
    element_type: String!
    screen_name: String!
    clicks: Int!
    unique_users: Int!
    repeat_clicks: Int!
    screen_views: Int!
    ctr: Float
  }

  type ProductElementTablePage {
    rows: [ProductElementRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ProductElementDetail {
    screen_name: String!
    key: String!
    clicks: Int!
    buckets: [String!]!
    clicks_series: [Int!]!
    users_series: [Int!]!
    platforms: [ProductCount!]!
  }

  "One app session: cut on the device after 30 minutes without activity; it lasts from its first event to its last."
  type ProductSession {
    session_id: ID!
    user_id: ID
    user_name: String
    device_id: String!
    platform: String!
    app_version: String!
    os_version: String!
    device_type: String!
    started_at: String!
    ended_at: String!
    duration_ms: Float!
    events: Int!
    screen_views: Int!
    clicks: Int!
    entry_screen: String!
    exit_screen: String!
  }

  type ProductSessionTablePage {
    rows: [ProductSession!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One stored event. Rows from before the taxonomy are named after their kind (screen_view, element_click)."
  type ProductEvent {
    id: ID!
    event_name: String!
    occurred_at: String!
    user_id: ID
    device_id: String!
    session_id: String!
    platform: String!
    app_version: String!
    screen_name: String!
    previous_screen: String!
    element_id: String!
    element_type: String!
    element_name: String!
    element_text: String!
    duration_ms: Float
    path: String!
    properties_json: String!
  }

  type ProductEventTablePage {
    rows: [ProductEvent!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ProductSessionDetail {
    session: ProductSession!
    "The session's events, oldest first (at most 1000)."
    events: [ProductEvent!]!
  }

  "What a funnel step matches: an event name, a screen view, an element press, or a server-confirmed outcome."
  enum ProductFunnelStepKind {
    EVENT
    SCREEN
    ELEMENT
    OUTCOME
  }

  "Outcomes read from the records that are the outcome — a Payment with paid_at, a PodMember — never from a click."
  enum ProductOutcome {
    SIGNED_UP
    POD_CREATED
    POD_JOINED
    PAYMENT_SUCCEEDED
    PAYMENT_FAILED
    PAYMENT_REFUNDED
  }

  input ProductFunnelStepInput {
    kind: ProductFunnelStepKind!
    "The event name, screen name, element id or label, or a ProductOutcome."
    value: String!
  }

  type ProductFunnelStep {
    kind: ProductFunnelStepKind!
    value: String!
    entered: Int!
    conversion_from_previous: Float
    conversion_from_start: Float
    dropped: Int!
    median_ms_from_previous: Float
  }

  type ProductFunnel {
    "Each person has this many days from entering the funnel to finish it."
    window_days: Int!
    "True when a step had more occurrences than one read takes, so its counts are a floor."
    truncated: Boolean!
    steps: [ProductFunnelStep!]!
  }

  "Who a cohort is made of: people first seen in the app in the period, or members who signed up in it."
  enum ProductCohortBasis {
    FIRST_SEEN
    SIGNED_UP
  }

  type ProductCohortRow {
    "The cohort's first day (yyyy-MM-dd) — a Monday for week cohorts."
    cohort: String!
    size: Int!
    "% retained per offset; null where that day or week has not come yet."
    retained: [Float]!
  }

  type ProductRetention {
    basis: ProductCohortBasis!
    granularity: AnalyticsGranularity!
    "Days (D1, D3, D7, D14, D30) for day cohorts; weeks 1-8 for week cohorts."
    offsets: [Int!]!
    rows: [ProductCohortRow!]!
    "Each offset over every cohort that has reached it, weighted by size."
    average: [Float]!
  }

  type ProductUserProfile {
    user_id: ID!
    name: String!
    registered_at: String
    first_seen_at: String
    last_seen_at: String
    platform: String
    app_version: String
    city: String
    "The country of the member's latest short-link click, when they followed one."
    country: String
    "utm_source / utm_campaign of the first and the latest short link the member followed."
    first_touch: String
    last_touch: String
    sessions: Int!
    screen_views: Int!
    events: Int!
    "How many different screens the member has opened."
    features_used: Int!
    top_features: [ProductCount!]!
    pods_created: Int!
    pods_joined: Int!
    payments_completed: Int!
  }

  "One entry of a member's timeline. CLIENT is what the app recorded; SERVER is a record (a payment, a booking)."
  type ProductTimelineEntry {
    id: ID!
    at: String!
    source: String!
    event_name: String!
    screen_name: String!
    label: String!
    session_id: String
    platform: String!
    properties_json: String!
  }

  "A member found by the User analytics search; the contact is masked."
  type ProductUserHit {
    user_id: ID!
    name: String!
    contact: String
  }

  extend type Query {
    "Every screen viewed in the period, as a table."
    productScreensTable(filter: ProductAnalyticsFilter, query: TableQueryInput): ProductScreenTablePage!
    productScreen(screen_name: String!, filter: ProductAnalyticsFilter): ProductScreenDetail!
    "Every element pressed in the period, per screen, as a table."
    productElementsTable(filter: ProductAnalyticsFilter, query: TableQueryInput): ProductElementTablePage!
    productElement(screen_name: String!, key: String!, filter: ProductAnalyticsFilter): ProductElementDetail!
    "Sessions that began in the period."
    productSessionsTable(filter: ProductAnalyticsFilter, query: TableQueryInput): ProductSessionTablePage!
    productSession(session_id: ID!): ProductSessionDetail
    "Events of the period."
    productEventsTable(filter: ProductAnalyticsFilter, query: TableQueryInput): ProductEventTablePage!
    "The event names stored in the period, most frequent first."
    productEventNames(filter: ProductAnalyticsFilter): [ProductCount!]!
    "The screens viewed in the period, most viewed first."
    productScreenNames(filter: ProductAnalyticsFilter): [ProductCount!]!
    "A funnel of 2-8 ordered steps; window_days (1-30, default 7) is how long a person has to finish it."
    productFunnel(steps: [ProductFunnelStepInput!]!, window_days: Int, filter: ProductAnalyticsFilter): ProductFunnel!
    "Cohort retention; DAY cohorts are read by week for periods over 62 days."
    productRetention(basis: ProductCohortBasis!, granularity: AnalyticsGranularity, filter: ProductAnalyticsFilter): ProductRetention!
    productUser(user_id: ID!): ProductUserProfile!
    "A member's timeline, newest first; pass the last entry's at as before for the next page."
    productUserTimeline(user_id: ID!, before: String, from: String, event_names: [String!], limit: Int): [ProductTimelineEntry!]!
    productUserSearch(search: String!): [ProductUserHit!]!
  }
`;
