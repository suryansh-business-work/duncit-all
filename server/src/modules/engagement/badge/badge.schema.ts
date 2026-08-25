export const badgeTypeDefs = /* GraphQL */ `
  enum BadgeConditionType {
    POD_JOIN_COUNT
    POD_HOST_COUNT
    CLUB_JOIN_COUNT
    POD_REFERRAL_COUNT
    POD_ATTEND_COUNT
    CATEGORY_POD_ATTEND_COUNT
    PLUS_ONE_POD_COUNT
    DISTINCT_CATEGORY_COUNT
    MONTHLY_POD_ATTEND_COUNT
    ROLE_GRANTED
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
    """
    CATEGORY_POD_ATTEND_COUNT only: the category the attended pods must be in.
    """
    category_id: ID
    """
    ROLE_GRANTED only: the role key that unlocks the badge.
    """
    role_key: String!
    sort_order: Int!
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

  """
  One badge measured against one member: the goal, how far along they are, and
  when they got there. Locked badges are returned too — the Badges section is
  what is still to be won as much as what already has been.
  """
  type BadgeProgress {
    badge: Badge!
    current: Int!
    target: Int!
    achieved: Boolean!
    """
    When the badge was first earned. Null while it is still locked.
    """
    achieved_at: String
  }

  input CreateBadgeInput {
    badge_id: String
    title: String!
    description: String
    image_url: String
    condition_type: BadgeConditionType!
    threshold: Int
    category_id: ID
    role_key: String
    sort_order: Int
    is_active: Boolean
  }

  input UpdateBadgeInput {
    title: String
    description: String
    image_url: String
    condition_type: BadgeConditionType
    threshold: Int
    category_id: ID
    role_key: String
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    badges(is_active: Boolean): [Badge!]!
    badge(badge_doc_id: ID!): Badge
    myBadges: [UserBadge!]!
    userBadges(user_id: ID!): [UserBadge!]!
    myBadgeProgress: [BadgeProgress!]!
    userBadgeProgress(user_id: ID!): [BadgeProgress!]!
  }

  extend type Mutation {
    createBadge(input: CreateBadgeInput!): Badge!
    updateBadge(badge_doc_id: ID!, input: UpdateBadgeInput!): Badge!
    deleteBadge(badge_doc_id: ID!): Boolean!
    awardBadgeManually(user_id: ID!, badge_doc_id: ID!, reason: String): UserBadge!
    revokeBadge(user_id: ID!, badge_doc_id: ID!): Boolean!
  }
`;
