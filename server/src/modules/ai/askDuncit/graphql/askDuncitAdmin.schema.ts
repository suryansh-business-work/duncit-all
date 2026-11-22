import gql from 'graphql-tag';

/**
 * Ask Duncit in the AI portal. Reads and operator edits (model settings,
 * knowledge base, feedback review) need AI_MANAGER or SUPER_ADMIN; the AI
 * Agent Control Center (role capabilities, tool access, approvals, quotas,
 * feature switches, kill switches) is SUPER_ADMIN only.
 */
export const askDuncitAdminTypeDefs = gql`
  enum AskDuncitAuditPreset {
    ALL
    CHAT
    OUT_OF_CONTEXT
    VIOLATIONS
    ACTIONS
  }

  enum AskDuncitToolAccess {
    ALLOW
    BLOCK
    DEFAULT
  }

  type AskDuncitFeatureSwitches {
    voice: Boolean!
    uploads: Boolean!
    memory: Boolean!
    proactive_alerts: Boolean!
    knowledge_base: Boolean!
    write_actions: Boolean!
    evaluation: Boolean!
    rollback: Boolean!
    handover: Boolean!
    chat_history: Boolean!
  }

  type AskDuncitRolePolicy {
    role_key: AskDuncitRoleKey!
    enabled: Boolean!
    kill_switch: Boolean!
    model: String!
    max_output_tokens: Int!
    allow_write: Boolean!
    allowed_categories: [String!]!
    allowed_tools: [String!]!
    blocked_tools: [String!]!
    approval_tools: [String!]!
    approve_all_writes: Boolean!
    messages_per_minute: Int!
    messages_per_day: Int!
    tokens_per_day: Int!
    instructions: String!
    suggestions: [AskDuncitSuggestion!]!
  }

  type AskDuncitSettings {
    enabled: Boolean!
    kill_switch: Boolean!
    kill_switch_reason: String!
    default_model: String!
    evaluator_model: String!
    transcription_model: String!
    speech_model: String!
    speech_voice: String!
    temperature: Float!
    max_output_tokens: Int!
    max_tool_rounds: Int!
    history_turns: Int!
    max_input_chars: Int!
    max_attachments: Int!
    max_attachment_mb: Float!
    low_confidence_threshold: Float!
    features: AskDuncitFeatureSwitches!
    roles: [AskDuncitRolePolicy!]!
    updated_at: String
    updated_by: String
  }

  "Model & LLM Settings — operators."
  input AskDuncitModelSettingsInput {
    default_model: String
    evaluator_model: String
    transcription_model: String
    speech_model: String
    speech_voice: String
    temperature: Float
    max_output_tokens: Int
    max_tool_rounds: Int
    history_turns: Int
    low_confidence_threshold: Float
  }

  input AskDuncitFeatureSwitchesInput {
    voice: Boolean
    uploads: Boolean
    memory: Boolean
    proactive_alerts: Boolean
    knowledge_base: Boolean
    write_actions: Boolean
    evaluation: Boolean
    rollback: Boolean
    handover: Boolean
    chat_history: Boolean
  }

  "AI Agent Control Center — super admins."
  input AskDuncitControlInput {
    enabled: Boolean
    max_input_chars: Int
    max_attachments: Int
    max_attachment_mb: Float
    features: AskDuncitFeatureSwitchesInput
  }

  input AskDuncitSuggestionInput {
    id: String!
    label_key: String
    label: String
    context: String
  }

  input AskDuncitRolePolicyInput {
    enabled: Boolean
    model: String
    max_output_tokens: Int
    allow_write: Boolean
    allowed_categories: [String!]
    allowed_tools: [String!]
    blocked_tools: [String!]
    approval_tools: [String!]
    approve_all_writes: Boolean
    messages_per_minute: Int
    messages_per_day: Int
    tokens_per_day: Int
    instructions: String
    suggestions: [AskDuncitSuggestionInput!]
  }

  type AskDuncitCount {
    key: String!
    count: Int!
  }

  type AskDuncitDaily {
    date: String!
    messages: Int!
    violations: Int!
    failed_actions: Int!
    users: Int!
  }

  type AskDuncitRoleUsage {
    role_key: String!
    messages: Int!
    users: Int!
  }

  type AskDuncitToolUsage {
    tool: String!
    calls: Int!
    failures: Int!
  }

  type AskDuncitViolationCount {
    kind: String!
    count: Int!
  }

  type AskDuncitDashboard {
    days: Int!
    conversations: Int!
    active_users: Int!
    messages: Int!
    resolution_rate: Float!
    avg_response_ms: Int!
    avg_first_token_ms: Int!
    avg_confidence: Float!
    total_tokens: Int!
    cost_usd: Float!
    tool_calls: Int!
    failed_actions: Int!
    errors: Int!
    handovers: Int!
    out_of_context: Int!
    violations: Int!
    thumbs_up: Int!
    thumbs_down: Int!
    satisfaction: Float!
    daily: [AskDuncitDaily!]!
    role_usage: [AskDuncitRoleUsage!]!
    top_tools: [AskDuncitToolUsage!]!
    violation_kinds: [AskDuncitViolationCount!]!
  }

  type AskDuncitSpendRow {
    key: String!
    calls: Int!
    tokens: Int!
    cost: Float!
  }

  type AskDuncitSpendDay {
    date: String!
    calls: Int!
    tokens: Int!
    cost: Float!
  }

  type AskDuncitRoleSpend {
    key: String
    tokens: Int!
    cost: Float!
  }

  type AskDuncitCost {
    days: Int!
    total_cost_usd: Float!
    total_tokens: Int!
    by_task: [AskDuncitSpendRow!]!
    by_model: [AskDuncitSpendRow!]!
    by_day: [AskDuncitSpendDay!]!
    by_role: [AskDuncitRoleSpend!]!
    unpriced_models: [String!]!
  }

  type AskDuncitAuditRow {
    id: ID!
    type: String!
    severity: String!
    status: String!
    user_id: String
    user_name: String!
    role_key: String!
    account_roles: [String!]!
    conversation_id: String
    message_id: String
    action_id: String
    surface: String!
    locale: String!
    page_route: String!
    entity_type: String!
    entity_id: String!
    query: String!
    response: String!
    model: String!
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
    cost_usd: Float!
    tool: String!
    tool_args: String!
    violation_kind: String
    reason: String!
    error_code: String!
    error_message: String!
    latency_ms: Int!
    detail: String!
    "False when the row no longer matches its tamper-evidence hash."
    intact: Boolean!
    created_at: String!
  }

  type AskDuncitAuditPage {
    rows: [AskDuncitAuditRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type AskDuncitConversationRow {
    id: ID!
    user_id: String!
    title: String!
    role_key: String!
    status: String!
    surface: String!
    message_count: Int!
    generating: Boolean!
    last_message_at: String
    last_message_preview: String!
    out_of_context_count: Int!
    violation_count: Int!
    thumbs_up: Int!
    thumbs_down: Int!
    total_tokens: Int!
    cost_usd: Float!
    handover_team: String
    handover_ticket_id: String
    created_at: String
  }

  type AskDuncitConversationRowPage {
    rows: [AskDuncitConversationRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type AskDuncitTranscriptMessage {
    id: ID!
    role: String!
    status: String!
    content: String!
    tool_calls: [String!]!
    model: String!
    tokens: Int!
    latency_ms: Int!
    confidence: Float
    out_of_context: Boolean!
    feedback_rating: String
    attachments: Int!
    created_at: String!
  }

  type AskDuncitConversationDetail {
    conversation: AskDuncitConversationRow!
    messages: [AskDuncitTranscriptMessage!]!
    actions: [AskDuncitAction!]!
    events: [AskDuncitAuditRow!]!
  }

  type AskDuncitFeedbackRow {
    id: ID!
    conversation_id: ID!
    user_id: String!
    content: String!
    confidence: Float
    low_confidence: Boolean!
    rating: String
    comment: String!
    review_status: String
    review_note: String!
    model: String!
    created_at: String!
    knowledge_draft_id: String
  }

  type AskDuncitFeedbackPage {
    rows: [AskDuncitFeedbackRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type AskDuncitKnowledgeArticle {
    id: ID!
    title: String!
    body: String
    kind: String!
    audience_roles: [AskDuncitRoleKey!]!
    tags: [String!]!
    locale: String!
    status: String!
    version: Int!
    hits: Int!
    updated_at: String
  }

  type AskDuncitKnowledgePage {
    rows: [AskDuncitKnowledgeArticle!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input AskDuncitKnowledgeInput {
    title: String
    body: String
    "ARTICLE | SOP | FAQ | POLICY"
    kind: String
    audience_roles: [AskDuncitRoleKey!]
    tags: [String!]
    locale: String
    "DRAFT | PUBLISHED | ARCHIVED"
    status: String
  }

  type AskDuncitToolRow {
    name: String!
    title: String!
    summary: String!
    category: String!
    category_label: String!
    risk: String!
    confirm: Boolean!
    outward: Boolean!
    allowed: Boolean!
    blocked: Boolean!
    explicitly_allowed: Boolean!
    approval_required: Boolean!
    calls: Int!
    failures: Int!
  }

  type AskDuncitToolPage {
    rows: [AskDuncitToolRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type AskDuncitToolCategory {
    key: String!
    label: String!
    tools: Int!
  }

  extend type Query {
    askDuncitSettings: AskDuncitSettings!
    askDuncitDashboard(days: Int): AskDuncitDashboard!
    askDuncitCost(days: Int): AskDuncitCost!
    askDuncitAuditTable(query: TableQueryInput, preset: AskDuncitAuditPreset): AskDuncitAuditPage!
    "Re-checks one audit row against its tamper-evidence hash."
    askDuncitVerifyAudit(id: ID!): Boolean!
    askDuncitConversationsTable(query: TableQueryInput, live: Boolean): AskDuncitConversationRowPage!
    askDuncitConversationDetail(id: ID!): AskDuncitConversationDetail
    askDuncitFeedbackTable(query: TableQueryInput): AskDuncitFeedbackPage!
    askDuncitKnowledgeTable(query: TableQueryInput): AskDuncitKnowledgePage!
    askDuncitKnowledgeArticle(id: ID!): AskDuncitKnowledgeArticle
    askDuncitToolTable(role: AskDuncitRoleKey!, query: TableQueryInput, days: Int): AskDuncitToolPage!
    askDuncitToolCategories: [AskDuncitToolCategory!]!
    "The AI Library code prompts Ask Duncit runs on, for Prompt Management."
    askDuncitPromptKeys: [String!]!
  }

  extend type Mutation {
    updateAskDuncitModelSettings(input: AskDuncitModelSettingsInput!): AskDuncitSettings!
    createAskDuncitKnowledge(input: AskDuncitKnowledgeInput!): AskDuncitKnowledgeArticle!
    updateAskDuncitKnowledge(id: ID!, input: AskDuncitKnowledgeInput!): AskDuncitKnowledgeArticle!
    deleteAskDuncitKnowledge(id: ID!): Boolean!
    "ACCEPTED | DISMISSED. add_to_knowledge drafts an article from the corrected answer."
    reviewAskDuncitFeedback(message_id: ID!, status: String!, note: String, add_to_knowledge: Boolean): AskDuncitFeedbackRow!
    updateAskDuncitControl(input: AskDuncitControlInput!): AskDuncitSettings!
    "Emergency stop, globally or for one role."
    setAskDuncitKillSwitch(on: Boolean!, reason: String, role: AskDuncitRoleKey): AskDuncitSettings!
    updateAskDuncitRolePolicy(role: AskDuncitRoleKey!, input: AskDuncitRolePolicyInput!): AskDuncitSettings!
    resetAskDuncitRolePolicy(role: AskDuncitRoleKey!): AskDuncitSettings!
    setAskDuncitToolAccess(role: AskDuncitRoleKey!, tool: String!, access: AskDuncitToolAccess!, force_approval: Boolean): AskDuncitSettings!
  }
`;
