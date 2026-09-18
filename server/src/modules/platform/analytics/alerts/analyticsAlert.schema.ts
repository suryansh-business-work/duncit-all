export const analyticsAlertTypeDefs = /* GraphQL */ `
  "When an alert trips: the tile's value above or below a number, or its change against the period before rising or falling by a percentage."
  enum AnalyticsAlertCondition {
    ABOVE
    BELOW
    RISES_BY
    FALLS_BY
  }

  enum AnalyticsAlertStatus {
    OK
    TRIGGERED
    ERROR
  }

  "A watch on one Analytics tile, checked every hour (Analytics > Settings > Alerts)."
  type AnalyticsAlert {
    id: ID!
    name: String!
    entity: AnalyticsEntity!
    "The tile's server key, as entityAnalytics names it."
    kpi_key: String!
    condition: AnalyticsAlertCondition!
    "In the tile's own units for ABOVE/BELOW, in percent for RISES_BY/FALLS_BY."
    threshold: Float!
    "The period the tile is read over: 7, 30, 90 or 365 days."
    days: Int!
    emails: [String!]!
    "Also post to the default Slack channel."
    slack: Boolean!
    is_active: Boolean!
    last_checked_at: String
    last_value: Float
    last_status: AnalyticsAlertStatus
    "Why the last check could not judge it: TILE_GONE, NO_COMPARISON or LOAD_FAILED."
    last_error: String
    last_notified_at: String
    created_at: String!
  }

  input AnalyticsAlertInput {
    name: String!
    entity: AnalyticsEntity!
    kpi_key: String!
    condition: AnalyticsAlertCondition!
    threshold: Float!
    days: Int!
    emails: [String!]!
    slack: Boolean!
    is_active: Boolean!
  }

  type AnalyticsAlertCheckResult {
    status: AnalyticsAlertStatus!
    value: Float
    error: String
    "Whether anyone was told — only a tripped alert tells anyone."
    notified: Boolean!
  }

  extend type Query {
    analyticsAlerts: [AnalyticsAlert!]!
  }

  extend type Mutation {
    createAnalyticsAlert(input: AnalyticsAlertInput!): AnalyticsAlert!
    updateAnalyticsAlert(id: ID!, input: AnalyticsAlertInput!): AnalyticsAlert!
    deleteAnalyticsAlert(id: ID!): Boolean!
    "Check one alert now; a tripped one tells its people straight away."
    checkAnalyticsAlertNow(id: ID!): AnalyticsAlertCheckResult!
    "Set a tile's goal (monthly for a count or an amount), or clear it with a null value."
    setAnalyticsTarget(entity: AnalyticsEntity!, key: String!, value: Float): Boolean!
  }
`;
