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
    "An ImageKit URL when a file came with it."
    attachment_url: String!
    attachment_name: String!
    attachment_type: String!
    "When the recipient read it; null until they do."
    read_at: String
    "Set when the author changed it, so the reader is told."
    edited_at: String
    """
    Set when the author took it back. The row stays and the words go, because a
    line that vanishes from the middle of a conversation reads as a bug.
    """
    deleted_at: String
    created_at: String
  }

  "Whether someone is at their desk. Held for as long as their socket is."
  type StaffPresence {
    user_id: ID!
    "ONLINE, AWAY, BUSY or OFFLINE."
    status: String!
    since: String
  }

  """
  A call that happened between two coworkers.

  The audio and video went browser to browser, so this row is the only record
  that it took place.
  """
  type StaffCall {
    id: ID!
    from_user_id: ID!
    to_user_id: ID!
    "AUDIO or VIDEO."
    kind: String!
    "ANSWERED, MISSED, DECLINED or CANCELLED."
    outcome: String!
    duration_seconds: Int!
    started_at: String
    ended_at: String
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
    "Everyone connected right now, for the first paint of the coworker list."
    staffPresence: [StaffPresence!]!
    "Every call on this line, newest first."
    staffCalls(peer_id: ID!, limit: Int): [StaffCall!]!
  }

  extend type Mutation {
    """
    Send a message, a file, or both. Text may be empty when a file comes with it.
    """
    sendStaffMessage(
      to_user_id: ID!
      text: String!
      attachment_url: String
      attachment_name: String
      attachment_type: String
    ): StaffMessage!
    "Change your own words. Only the text — never the attachment."
    editStaffMessage(id: ID!, text: String!): StaffMessage!
    "Take back your own message. The row stays; the words go."
    deleteStaffMessage(id: ID!): StaffMessage!
    "Mark what they sent you as read. Returns how many that was."
    markStaffThreadRead(peer_id: ID!): Int!
  }
`;
