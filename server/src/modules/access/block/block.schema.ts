export const blockTypeDefs = /* GraphQL */ `
  "One member blocking another, as Legal's Blocked accounts table shows it."
  type UserBlockRow {
    id: ID!
    blocker_id: ID!
    blocker_name: String!
    blocked_id: ID!
    blocked_name: String!
    "False once the blocker lifted it. The row stays as the record."
    active: Boolean!
    blocked_at: String!
    unblocked_at: String
  }

  type UserBlockTablePage {
    rows: [UserBlockRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Legal-only: every block members have made, newest first."
    userBlocksTable(query: TableQueryInput): UserBlockTablePage!
  }

  extend type Mutation {
    """
    Block a member: cuts every follow tie between the two, both ways, and
    hides each from the other. Idempotent. The blocker is sent a confirmation;
    the blocked member is never told.
    """
    blockUser(user_id: ID!): Boolean!
    "Lift a block made earlier. Follows cut by it are not restored."
    unblockUser(user_id: ID!): Boolean!
  }
`;
