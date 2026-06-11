export const supportChatTypeDefs = /* GraphQL */ `
  enum SupportChatStatus {
    OPEN
    CLOSED
  }

  enum SupportChatSenderRole {
    USER
    AGENT
    SYSTEM
  }

  type SupportChatUser {
    id: ID!
    name: String!
    phone: String
    avatar_url: String
  }

  type SupportChatMessage {
    id: ID!
    session_id: ID!
    sender_id: ID!
    sender_role: SupportChatSenderRole!
    sender_name: String!
    sender_photo: String
    text: String!
    attachments: [String!]!
    created_at: String!
  }

  type SupportChatSession {
    id: ID!
    user: SupportChatUser!
    agent_id: ID
    status: SupportChatStatus!
    last_message_at: String!
    last_message_preview: String!
    unread_for_agent: Int!
    unread_for_user: Int!
    created_at: String!
    updated_at: String!
  }

  "One row of the user's unified support history (every category in one list)."
  type UnifiedSupportTicket {
    id: ID!
    "Prefixed human ticket number — ST- (ticket), SOS-, CB- (callback), CH- (chat)."
    ticket_no: String!
    title: String!
    status: String!
    "TICKET | SOS | CALLBACK | CHAT"
    source: String!
    created_at: String!
  }

  input SupportCreateUserInput {
    first_name: String!
    last_name: String
    email: String!
    phone_extension: String
    phone_number: String
    password: String!
  }

  extend type Query {
    supportChatSessions(status: SupportChatStatus): [SupportChatSession!]!
    supportChatMessages(session_id: ID!, limit: Int, before: String): [SupportChatMessage!]!
    mySupportChat: SupportChatSession
    "All of the signed-in user's support items (tickets, SOS, callbacks, chats)."
    myUnifiedSupportTickets: [UnifiedSupportTicket!]!
  }

  extend type Mutation {
    startSupportChat(text: String): SupportChatSession!
    sendSupportChatMessage(
      session_id: ID!
      text: String
      attachments: [String!]
    ): SupportChatMessage!
    closeSupportChat(session_id: ID!): SupportChatSession!
    markSupportChatRead(session_id: ID!): SupportChatSession!
    "Agent picks up an unassigned chat — announced as a SYSTEM bubble."
    claimSupportChat(session_id: ID!): SupportChatSession!
    "Support agents can create a user account on a caller's behalf."
    supportCreateUser(input: SupportCreateUserInput!): User!
  }
`;
