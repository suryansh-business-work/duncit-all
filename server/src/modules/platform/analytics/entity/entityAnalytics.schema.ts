export const entityAnalyticsTypeDefs = /* GraphQL */ `
  "The subjects the Analytics console reports on."
  enum AnalyticsEntity {
    USERS
    PODS
    CLUBS
    CLUB_ADMINS
    HOSTS
    DATABASE
    ENV_KEYS
    SONARQUBE
    TEST_COVERAGE
    STRESS_TESTS
    E2E_TESTS
    REVENUE
    REWARDS
    SHOP
    VENUES
    MARKETING
    COMMUNICATIONS
    SUPPORT
    LEGAL
    AI_USAGE
    API_PERFORMANCE
    SERVER
    APP_RELEASES
    FUNNEL
    "The Duncit Pet Store (ecomm.duncit.com)."
    PET_STORE
    "Every log the Logs console lists (logs.duncit.com)."
    LOGS
    "What WhatsApp messages cost, in rupees."
    WHATSAPP_COSTS
    "What OpenAI requests cost, in US dollars."
    OPENAI_COSTS
  }

  "What kind of number a value is, so the console formats it."
  enum AnalyticsFormat {
    COUNT
    PERCENT
    CURRENCY
    RATING
    DAYS
    DECIMAL
    "A size in bytes."
    BYTES
    "A length of time in milliseconds."
    DURATION
    "SonarQube's rating, 1 (A) to 5 (E)."
    GRADE
    "An amount in US dollars, which is what OpenAI bills in."
    USD
    "A check's result: 1 passed, 0 failed, null never run."
    OUTCOME
  }

  "WINDOW follows the chosen period; ALL_TIME is the state of things right now."
  enum AnalyticsScope {
    WINDOW
    ALL_TIME
  }

  "What the tiles are compared with: the period just before, or the same dates a year earlier."
  enum AnalyticsCompare {
    PREVIOUS
    YEAR
  }

  type AnalyticsPeriod {
    days: Int!
    from: String!
    to: String!
    granularity: AnalyticsGranularity!
    compare: AnalyticsCompare!
    "The comparison period the previous values were read over."
    previous_from: String!
    previous_to: String!
    "The location the page was narrowed to; null for every city."
    city: ID
  }

  "A city a page can be narrowed to."
  type AnalyticsCity {
    id: ID!
    name: String!
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
    "The console page with the records behind this, for more details."
    url: String
    "The goal this tile is judged against over the period shown; null when none is set."
    target: Float
    "The goal as it was set — monthly for a count or an amount, which target scales to the period."
    target_goal: Float
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
    "The console page with the records behind this, for more details."
    url: String
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
    "The console page with the records behind this, for more details."
    url: String
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
    "The console page with the records behind this, for more details."
    url: String
  }

  type AnalyticsLeaderboard {
    key: String!
    columns: [AnalyticsColumn!]!
    rows: [AnalyticsLeaderRow!]!
    "The console page with the records behind this, for more details."
    url: String
  }

  type EntityAnalytics {
    entity: AnalyticsEntity!
    period: AnalyticsPeriod!
    kpis: [AnalyticsKpi!]!
    trends: [AnalyticsTrend!]!
    breakdowns: [AnalyticsBreakdown!]!
    "The period's top ten; null where a ranking would not add anything."
    leaderboard: AnalyticsLeaderboard
    "The console this page is about, for more details."
    details_url: String
  }

  extend type Query {
    """
    One Analytics console page: tiles, trends, breakdowns and a ranking. Either a preset days
    (clamped to 7-365) or a calendar range from-to (yyyy-MM-dd in the admin zone, inclusive,
    at most a year); city narrows the pages that can be narrowed (Pods, Clubs).
    """
    entityAnalytics(
      entity: AnalyticsEntity!
      days: Int
      from: String
      to: String
      compare: AnalyticsCompare
      city: ID
    ): EntityAnalytics!
    "The cities an Analytics page can be narrowed to."
    analyticsCities: [AnalyticsCity!]!
  }
`;
