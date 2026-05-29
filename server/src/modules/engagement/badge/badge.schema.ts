export const badgeTypeDefs = /* GraphQL */ `
  enum BadgeConditionType {
    POD_JOIN_COUNT
    POD_HOST_COUNT
    CLUB_JOIN_COUNT
    POD_REFERRAL_COUNT
    MANUAL
  }

  type Badge {
    id: ID!
    badge_id: String!
    title: String!
    description: String!
    image_url: String!
    condition_type: BadgeConditionType!
    threshold: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  type UserBadge {
    id: ID!
    user_id: ID!
    badge_id: ID!
    badge: Badge
    awarded_at: String!
    awarded_reason: String!
  }

  input CreateBadgeInput {
    badge_id: String
    title: String!
    description: String
    image_url: String
    condition_type: BadgeConditionType!
    threshold: Int
    is_active: Boolean
  }

  input UpdateBadgeInput {
    title: String
    description: String
    image_url: String
    condition_type: BadgeConditionType
    threshold: Int
    is_active: Boolean
  }

  extend type Query {
    badges(is_active: Boolean): [Badge!]!
    badge(badge_doc_id: ID!): Badge
    myBadges: [UserBadge!]!
    userBadges(user_id: ID!): [UserBadge!]!
  }

  extend type Mutation {
    createBadge(input: CreateBadgeInput!): Badge!
    updateBadge(badge_doc_id: ID!, input: UpdateBadgeInput!): Badge!
    deleteBadge(badge_doc_id: ID!): Boolean!
    awardBadgeManually(user_id: ID!, badge_doc_id: ID!, reason: String): UserBadge!
    revokeBadge(user_id: ID!, badge_doc_id: ID!): Boolean!
  }
`;
