export const leaderboardTypeDefs = /* GraphQL */ `
  "The five boards. Each ranks a different way of showing up for the platform."
  enum LeaderboardCategory {
    USER
    HOST
    CLUB_ADMIN
    VENUE
    BRAND
  }

  "Ranking window. MONTH and YEAR are the current calendar window, in UTC."
  enum LeaderboardPeriod {
    MONTH
    YEAR
    ALL
  }

  "When a reward's window closes and it is handed out."
  enum LeaderboardRewardPeriod {
    MONTHLY
    YEARLY
  }

  "One ranked row of a board."
  type LeaderboardEntry {
    rank: Int!
    user_id: ID!
    "Display name from the profile. May be empty for a deleted account."
    name: String!
    avatar_url: String!
    points: Float!
    "True when this row is the caller."
    is_me: Boolean!
  }

  "One board ranked over one window, with the caller's own position."
  type LeaderboardBoard {
    category: LeaderboardCategory!
    period: LeaderboardPeriod!
    "Top rows, best first. Rank counts everyone, not just this page."
    rows: [LeaderboardEntry!]!
    "The caller's points in this window — 0 when they have none yet."
    my_points: Float!
    "The caller's 1-based rank. Null until they hold points in this window."
    my_rank: Int
    "Distinct users holding at least one point in this window."
    participants: Int!
  }

  "A prize the admin promises for finishing a window inside a rank range."
  type LeaderboardReward {
    category: LeaderboardCategory!
    period: LeaderboardRewardPeriod!
    rank_from: Int!
    rank_to: Int!
    title: String!
    description: String!
    is_active: Boolean!
    sort_order: Int!
  }

  """
  Points-per-action plus the reward list. The apps render "How to increase
  your points" and the rewards showcase from this, so changing a number in
  Admin > Leaderboard changes what every surface promises — no client release.
  """
  type LeaderboardConfig {
    "Points a member earns for each successful pod join."
    points_per_join: Float!
    "Points a host earns when their pod completes."
    points_per_host: Float!
    "Points a club admin earns when a pod of their club completes."
    points_per_club_pod: Float!
    "Points a venue owner earns when a pod completes at their venue."
    points_per_venue_pod: Float!
    "Points a brand owner earns per product sold."
    points_per_product_sale: Float!
    "Active rewards only, in display order."
    rewards: [LeaderboardReward!]!
  }

  "The admin view of the settings singleton — every reward, active or not."
  type LeaderboardSettings {
    points_per_join: Float!
    points_per_host: Float!
    points_per_club_pod: Float!
    points_per_venue_pod: Float!
    points_per_product_sale: Float!
    rewards: [LeaderboardReward!]!
    updated_at: String
  }

  input LeaderboardRewardInput {
    category: LeaderboardCategory!
    period: LeaderboardRewardPeriod!
    rank_from: Int!
    rank_to: Int!
    title: String!
    description: String
    is_active: Boolean
    sort_order: Int
  }

  "Scalars are patched individually; a present rewards array replaces the whole list."
  input UpdateLeaderboardSettingsInput {
    points_per_join: Float
    points_per_host: Float
    points_per_club_pod: Float
    points_per_venue_pod: Float
    points_per_product_sale: Float
    rewards: [LeaderboardRewardInput!]
  }

  "One points ledger row joined to its user and pod, for Admin > Leaderboard."
  type LeaderboardAdminPoint {
    id: ID!
    category: LeaderboardCategory!
    user_id: ID!
    user_name: String!
    user_email: String!
    points: Float!
    source_type: String!
    "Business key of the earning event — pod id, or order:product:variant."
    source_id: String!
    pod_id: ID
    pod_title: String!
    created_at: String!
  }

  "Server-side table page for the shared table engine (leaderboardPointsTable)."
  type LeaderboardAdminPointTablePage {
    rows: [LeaderboardAdminPoint!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One headline card per board for Admin > Leaderboard > Boards."
  type LeaderboardCategoryStats {
    category: LeaderboardCategory!
    "Every point ever granted on this board."
    total_points: Float!
    "Ledger rows written on this board."
    awards_count: Int!
    "Distinct users holding at least one point on this board."
    participants: Int!
  }

  extend type Query {
    "One ranked board with the caller's own points and rank. Period defaults to MONTH."
    leaderboard(category: LeaderboardCategory!, period: LeaderboardPeriod): LeaderboardBoard!
    "Points-per-action and active rewards. Public, like the ad rate card."
    leaderboardConfig: LeaderboardConfig!
    "Admin > Leaderboard > Settings & Rewards."
    leaderboardSettings: LeaderboardSettings!
    "Admin > Leaderboard > Points Ledger."
    leaderboardPointsTable(query: TableQueryInput): LeaderboardAdminPointTablePage!
    "Admin > Leaderboard > Boards headline cards."
    leaderboardAdminStats: [LeaderboardCategoryStats!]!
  }

  extend type Mutation {
    updateLeaderboardSettings(input: UpdateLeaderboardSettingsInput!): LeaderboardSettings!
  }
`;
