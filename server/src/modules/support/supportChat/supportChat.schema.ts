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
    "AGENT message authored by the AI assistant rather than a human."
    is_ai: Boolean!
    created_at: String!
  }

  type SupportChatSession {
    id: ID!
    "Per-chat support ticket number, e.g. CH-A1B2C3."
    ticket_no: String!
    user: SupportChatUser!
    agent_id: ID
    status: SupportChatStatus!
    last_message_at: String!
    last_message_preview: String!
    unread_for_agent: Int!
    unread_for_user: Int!
    "When each side last opened the chat (drives Seen / blue-tick state)."
    user_last_read_at: String
    agent_last_read_at: String
    "True while the AI assistant is answering; false once a human takes over."
    ai_active: Boolean!
    handed_off: Boolean!
    rating: Int
    feedback_comment: String
    feedback_at: String
    "When the chat was resolved/closed (drives the reopen window)."
    resolved_at: String
    "User can reopen the chat until this instant (null if not resolved/closed)."
    reopen_deadline: String
    created_at: String!
    updated_at: String!
  }

  "Export format for support chat / ticket transcripts."
  enum TranscriptFormat {
    TXT
    DOCX
  }

  "A server-generated export of a chat or ticket (filename + base64 content)."
  type SupportChatTranscript {
    filename: String!
    "Plain-text rendering (always present, regardless of the chosen format)."
    text: String!
    "Base64-encoded file for the requested format (.txt utf-8 or .docx binary)."
    content_base64: String!
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

  "A page of support chat sessions for the agent list (server-side pagination + sort + search)."
  type SupportChatSessionPage {
    items: [SupportChatSession!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    supportChatSessions(
      status: SupportChatStatus
      search: String
      page: Int
      page_size: Int
      sort_by: String
      sort_dir: String
    ): SupportChatSessionPage!
    supportChatMessages(session_id: ID!, limit: Int, before: String): [SupportChatMessage!]!
    mySupportChat: SupportChatSession
    "All of the signed-in user's support items (tickets, SOS, callbacks, chats)."
    myUnifiedSupportTickets: [UnifiedSupportTicket!]!
    "Transcript of a chat (.txt or .docx) — accessible to its owner or a support agent."
    supportChatTranscript(session_id: ID!, format: TranscriptFormat): SupportChatTranscript!
  }

  extend type Mutation {
    startSupportChat(text: String): SupportChatSession!
    sendSupportChatMessage(
      session_id: ID!
      text: String
      attachments: [String!]
    ): SupportChatMessage!
    closeSupportChat(session_id: ID!): SupportChatSession!
    "The user (or an agent) marks the chat resolved — same as close, owner-allowed."
    resolveSupportChat(session_id: ID!): SupportChatSession!
    "Re-open a resolved/closed chat (user within 3 days, or an agent). Reason logged to the thread."
    reopenSupportChat(session_id: ID!, reason: String): SupportChatSession!
    "Leave a 1-5 satisfaction rating + optional comment on a chat."
    submitSupportChatFeedback(
      session_id: ID!
      rating: Int!
      comment: String
    ): SupportChatSession!
    "Email the chat transcript to an address (defaults to a .docx attachment)."
    emailSupportChatTranscript(session_id: ID!, email: String!, format: TranscriptFormat): Boolean!
    markSupportChatRead(session_id: ID!): SupportChatSession!
    "Agent picks up an unassigned chat — announced as a SYSTEM bubble."
    claimSupportChat(session_id: ID!): SupportChatSession!
    "Support agents can create a user account on a caller's behalf."
    supportCreateUser(input: SupportCreateUserInput!): User!
  }
`;
