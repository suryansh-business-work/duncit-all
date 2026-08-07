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

"One person's reaction to one message. At most one per person per message."
  type StaffReaction {
    user_id: ID!
    "The emoji itself. Any is allowed; the bar offers six."
    emoji: String!
    at: String
  }

  """
  What a link in a message turns into on screen. An outside link gets an Open
  Graph card; one of our own consoles gets the portal it points at and whether
  the person reading can actually open it.
  """
  type StaffLinkPreview {
    url: String!
    "True when it points at one of our own consoles."
    internal: Boolean!
    "Which console, when internal."
    portal: String
    title: String
    description: String
    image: String
    "Whether the CALLER can open it. Always true for an outside link."
    has_access: Boolean!
    "Why not, when they cannot."
    access_note: String
  }

  "Narrows a thread search. Every field is optional and they combine."
  input StaffSearchInput {
    text: String
    "Only what this person wrote."
    from_user_id: ID
    "ISO timestamps, inclusive."
    after: String
    before: String
    "Only messages carrying a file."
    only_files: Boolean
    "Only messages containing a link."
    only_links: Boolean
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
    """
    Who reacted and with what. Empty on a deleted message — there is nothing
    left to have reacted to.
    """
    reactions: [StaffReaction!]!
    "Set when it reached any of their open tabs — the second tick."
    delivered_at: String
    "The message this one answers, when it is a reply."
    reply_to_id: ID
    "Whose words these originally were, when it was forwarded on."
    forwarded_from: ID
    "Set when somebody pinned it. Pins belong to the thread, not to a person."
    pinned_at: String
    pinned_by: ID
    "Who was named with @ in the text."
    mentions: [ID!]!
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
    staffMessages(peer_id: ID!, limit: Int, before: String): [StaffMessage!]!
    "Resolve a link for the card that renders it."
    staffLinkPreview(url: String!): StaffLinkPreview!
    "Everything pinned on this line, newest pin first."
    pinnedStaffMessages(peer_id: ID!): [StaffMessage!]!
    "Find something that was said on this line."
    searchStaffMessages(peer_id: ID!, filter: StaffSearchInput): [StaffMessage!]!
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
      "The message this one answers, when it is a reply."
      reply_to_id: ID
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
    """
    React, or take the reaction back. The same kind again removes it; a
    different kind replaces it, so one person is only ever counted once.
    """
    reactToStaffMessage(id: ID!, emoji: String!): StaffMessage!
    "Send an existing message on to somebody else — a copy, not a pointer."
    forwardStaffMessage(id: ID!, to_user_id: ID!): StaffMessage!
    "Pin, or take the pin off. Pins belong to the thread, so both people see them."
    pinStaffMessage(id: ID!): StaffMessage!
    "Mark what they sent you as read. Returns how many that was."
    markStaffThreadRead(peer_id: ID!): Int!
  }
`;
