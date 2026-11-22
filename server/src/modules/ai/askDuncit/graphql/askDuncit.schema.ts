import gql from 'graphql-tag';

/**
 * Ask Duncit — the member-facing API (mWeb + Native). Every field is signed-in
 * only and scoped to the caller: conversations, messages, actions and memory
 * of anyone else answer NOT_FOUND. Answers stream over the socket
 * (`askDuncit:*` events); these fields start turns and read what was stored.
 */
export const askDuncitTypeDefs = gql`
  enum AskDuncitRoleKey {
    MEMBER
    HOST
    VENUE_OWNER
    CLUB_ADMIN
    REGIONAL_CLUB_ADMIN
    ECOMM_BRAND
    FREELANCER
    STAFF
    SUPER_ADMIN
  }

  enum AskDuncitSurface {
    MWEB
    NATIVE
    PORTAL
  }

  "Where the person is in the app, so the assistant can answer about what is on screen."
  input AskDuncitPageInput {
    route: String
    "POD | CLUB | VENUE | PROFILE | WALLET …"
    entity_type: String
    entity_id: String
  }

  "A file already uploaded through the app's ImageKit flow."
  input AskDuncitAttachmentInput {
    url: String!
    "IMAGE | PDF | FILE"
    kind: String
    name: String
    mime: String
    size: Int
  }

  input AskDuncitSendInput {
    message: String!
    "Omit to start a new conversation."
    conversation_id: ID
    "The studio mode or role the person is using; only a role they hold is honoured."
    role: String
    surface: AskDuncitSurface
    locale: String
    page: AskDuncitPageInput
    attachments: [AskDuncitAttachmentInput!]
  }

  type AskDuncitSuggestion {
    id: String!
    "Localization key of the bubble text; null for an operator-written bubble."
    label_key: String
    label: String
    context: String
  }

  type AskDuncitAlert {
    id: String!
    kind: String!
    "INFO | WARN | CRITICAL"
    severity: String!
    label_key: String!
    "JSON object filling the label's placeholders."
    params: String!
    prompt_key: String!
  }

  type AskDuncitFeatures {
    voice: Boolean!
    uploads: Boolean!
    memory: Boolean!
    proactive_alerts: Boolean!
    knowledge_base: Boolean!
    write_actions: Boolean!
    rollback: Boolean!
    handover: Boolean!
    chat_history: Boolean!
  }

  type AskDuncitLimits {
    max_input_chars: Int!
    max_attachments: Int!
    max_attachment_mb: Float!
    messages_today: Int!
    messages_per_day: Int!
  }

  type AskDuncitBootstrap {
    available: Boolean!
    "KILL_SWITCH | DISABLED | ROLE_DISABLED — the app words it."
    unavailable_reason: String
    role_key: AskDuncitRoleKey!
    held_roles: [AskDuncitRoleKey!]!
    can_write: Boolean!
    features: AskDuncitFeatures!
    suggestions: [AskDuncitSuggestion!]!
    alerts: [AskDuncitAlert!]!
    limits: AskDuncitLimits!
  }

  type AskDuncitConversation {
    id: ID!
    title: String!
    role_key: AskDuncitRoleKey!
    "ACTIVE | HANDED_OVER | ARCHIVED"
    status: String!
    surface: AskDuncitSurface!
    message_count: Int!
    last_message_at: String
    last_message_preview: String!
    generating: Boolean!
    handover_team: String
    handover_ticket_id: String
    created_at: String
  }

  type AskDuncitConversationPage {
    items: [AskDuncitConversation!]!
    has_more: Boolean!
  }

  type AskDuncitAttachment {
    url: String!
    kind: String!
    name: String!
    mime: String!
    size: Int!
  }

  type AskDuncitToolCall {
    name: String!
    title: String!
    risk: String!
    "OK | DENIED | ERROR | BLOCKED | INVALID | AWAITING_APPROVAL"
    status: String!
    action_id: String
  }

  "A change the assistant proposed. Nothing runs until the person approves it."
  type AskDuncitAction {
    id: ID!
    conversation_id: ID!
    message_id: String
    tool: String!
    tool_title: String!
    category: String!
    risk: String!
    "The arguments, with sensitive values masked."
    args_preview: String!
    reason: String!
    "PENDING | APPROVED | EXECUTING | EXECUTED | FAILED | REJECTED | EXPIRED | ROLLED_BACK"
    status: String!
    expires_at: String!
    decided_at: String
    executed_at: String
    result_preview: String!
    error_message: String!
    can_rollback: Boolean!
    created_at: String!
  }

  type AskDuncitKnowledgeRef {
    id: String!
    title: String!
  }

  type AskDuncitMessage {
    id: ID!
    conversation_id: ID!
    "user | assistant"
    role: String!
    content: String!
    "STREAMING | COMPLETE | FAILED | STOPPED"
    status: String!
    attachments: [AskDuncitAttachment!]!
    tool_calls: [AskDuncitToolCall!]!
    actions: [AskDuncitAction!]!
    knowledge_refs: [AskDuncitKnowledgeRef!]!
    confidence: Float
    low_confidence: Boolean!
    out_of_context: Boolean!
    feedback_rating: String
    "Why an answer is missing — INJECTION_BLOCKED, NOT_CONFIGURED … — the app words it."
    error_code: String
    created_at: String!
  }

  type AskDuncitMessagePage {
    items: [AskDuncitMessage!]!
    has_more: Boolean!
  }

  type AskDuncitSendResult {
    conversation_id: ID!
    user_message_id: ID!
    "The answer's id — its text streams in askDuncit:delta events."
    message_id: ID!
    role_key: AskDuncitRoleKey!
    "STREAMING | BLOCKED"
    status: String!
  }

  type AskDuncitMemoryFact {
    id: String!
    text: String!
    created_at: String!
  }

  type AskDuncitHandoverResult {
    ticket_id: String!
    ticket_no: String!
    team: String!
    already: Boolean!
  }

  extend type Query {
    "Whether Ask Duncit is available to the caller, in which role, with which features and suggestions."
    askDuncitBootstrap(role: String, page: AskDuncitPageInput, surface: AskDuncitSurface): AskDuncitBootstrap!
    askDuncitConversations(before: String, limit: Int, search: String): AskDuncitConversationPage!
    askDuncitConversation(id: ID!): AskDuncitConversation!
    "Oldest→newest; pass the first message id as before to load older ones."
    askDuncitMessages(conversation_id: ID!, before: ID, limit: Int): AskDuncitMessagePage!
    askDuncitMessage(id: ID!): AskDuncitMessage!
    askDuncitMyActions(limit: Int): [AskDuncitAction!]!
    askDuncitMemory: [AskDuncitMemoryFact!]!
  }

  extend type Mutation {
    sendAskDuncitMessage(input: AskDuncitSendInput!): AskDuncitSendResult!
    stopAskDuncitMessage(message_id: ID!): Boolean!
    "Approve or reject a proposed change. Permission is re-checked when it runs."
    decideAskDuncitAction(id: ID!, approve: Boolean!, surface: AskDuncitSurface): AskDuncitAction!
    rollbackAskDuncitAction(id: ID!, surface: AskDuncitSurface): AskDuncitAction!
    "UP | DOWN"
    rateAskDuncitMessage(message_id: ID!, rating: String!, comment: String): AskDuncitMessage!
    handOverAskDuncitConversation(conversation_id: ID!, team: String, summary: String, role: String, surface: AskDuncitSurface): AskDuncitHandoverResult!
    renameAskDuncitConversation(id: ID!, title: String!): AskDuncitConversation!
    deleteAskDuncitConversation(id: ID!): Boolean!
    clearAskDuncitHistory: Boolean!
    forgetAskDuncitFact(id: String!): Boolean!
    clearAskDuncitMemory: Boolean!
  }
`;
