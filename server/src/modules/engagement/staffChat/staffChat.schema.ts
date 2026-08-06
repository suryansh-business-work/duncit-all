export const staffChatTypeDefs = /* GraphQL */ `
  """
  Someone who works here: anyone holding a role that admits them to a staff
  console. Membership follows the roles, so nobody maintains this list.
  """
  type Coworker {
    id: ID!
    name: String!
    email: String!
    photo: String!
    "Only their staff roles — the ones that put them in this directory."
    roles: [String!]!
  }

  type StaffMessage {
    id: ID!
    from_user_id: ID!
    to_user_id: ID!
    text: String!
    "When the recipient read it; null until they do."
    read_at: String
    created_at: String
  }

  "A conversation you already have, for the list down the side."
  type StaffThread {
    peer: Coworker!
    last_text: String!
    last_at: String
    "So the list can show 'You: …' without comparing ids in the browser."
    last_from_me: Boolean!
    unread: Int!
  }

  extend type Query {
    "Everyone you could message, minus yourself. Search matches name or email."
    coworkers(search: String, role: String): [Coworker!]!
    "The conversations you already have, most recent first."
    staffThreads: [StaffThread!]!
    "One conversation, oldest message last."
    staffMessages(peer_id: ID!, limit: Int): [StaffMessage!]!
    "Everything anyone has sent you and you have not opened."
    staffUnreadCount: Int!
  }

  extend type Mutation {
    sendStaffMessage(to_user_id: ID!, text: String!): StaffMessage!
    "Mark what they sent you as read. Returns how many that was."
    markStaffThreadRead(peer_id: ID!): Int!
  }
`;
