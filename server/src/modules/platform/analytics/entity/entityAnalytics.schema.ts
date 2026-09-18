export const entityAnalyticsTypeDefs = /* GraphQL */ `
  "The subjects the Analytics console reports on."
  enum AnalyticsEntity {
    USERS
    PODS
    CLUBS
    CLUB_ADMINS
    HOSTS
  }

  "What kind of number a value is, so the console formats it."
  enum AnalyticsFormat {
    COUNT
    PERCENT
    CURRENCY
    RATING
    DAYS
    DECIMAL
  }

  "WINDOW follows the chosen period; ALL_TIME is the state of things right now."
  enum AnalyticsScope {
    WINDOW
    ALL_TIME
  }

  type AnalyticsPeriod {
    days: Int!
    from: String!
    to: String!
    granularity: AnalyticsGranularity!
  }

  "One headline number, beside the same number for the period before."
  type AnalyticsKpi {
    key: String!
    value: Float!
    "Null for a live count, which has no period to compare with."
    previous: Float
    format: AnalyticsFormat!
    "Whether a rise is good news — a rising cancellation rate is not."
    higher_is_better: Boolean!
  }

  type AnalyticsSeries {
    key: String!
    "One value per bucket, aligned with the trend's buckets."
    values: [Float!]!
  }

  type AnalyticsTrend {
    key: String!
    format: AnalyticsFormat!
    granularity: AnalyticsGranularity!
    "The first calendar day (yyyy-MM-dd) of every bucket, oldest first."
    buckets: [String!]!
    series: [AnalyticsSeries!]!
  }

  type AnalyticsSlice {
    key: String!
    "A name read from the data (a city, a category); null when the key is the label."
    label: String
    value: Float!
  }

  type AnalyticsBreakdown {
    key: String!
    format: AnalyticsFormat!
    scope: AnalyticsScope!
    "True when the slices have a natural order that sorting would break."
    ordered: Boolean!
    slices: [AnalyticsSlice!]!
  }

  type AnalyticsColumn {
    key: String!
    format: AnalyticsFormat!
  }

  type AnalyticsLeaderRow {
    id: ID!
    name: String!
    caption: String
    "One value per column, in column order; null where there is nothing to show."
    values: [Float]!
  }

  type AnalyticsLeaderboard {
    key: String!
    columns: [AnalyticsColumn!]!
    rows: [AnalyticsLeaderRow!]!
  }

  type EntityAnalytics {
    entity: AnalyticsEntity!
    period: AnalyticsPeriod!
    kpis: [AnalyticsKpi!]!
    trends: [AnalyticsTrend!]!
    breakdowns: [AnalyticsBreakdown!]!
    "The period's top ten; null where a ranking would not add anything."
    leaderboard: AnalyticsLeaderboard
  }

  extend type Query {
    "One Analytics console page: tiles, trends, breakdowns and a ranking. days is clamped to 7-365."
    entityAnalytics(entity: AnalyticsEntity!, days: Int): EntityAnalytics!
  }
`;
