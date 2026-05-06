export const analyticsTypeDefs = /* GraphQL */ `
  enum AnalyticsGranularity {
    DAY
    WEEK
    MONTH
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
  }

  extend type Query {
    activeUserStats(
      from: String!
      to: String!
      granularity: AnalyticsGranularity
      super_category_slug: String
    ): ActiveUserStats!
    dashboardTotals(super_category_slug: String): DashboardTotals!
  }

  extend type Mutation {
    recordActivePing(super_category_slug: String): Boolean!
  }
`;
