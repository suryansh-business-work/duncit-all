import gql from 'graphql-tag';

/**
 * Duncit Intel (intel.duncit.com). Every field needs an Intel role
 * (INTEL_USER, INTEL_MANAGER or SUPER_ADMIN); settings, connectors, sync and
 * approvals need INTEL_MANAGER; access and security settings need SUPER_ADMIN.
 * Conversations, messages and private files are scoped to the caller — someone
 * else's answer NOT_FOUND. Answers stream over the socket (`intel:*` events).
 *
 * Settings sections and connector options are kind-specific, so they travel as
 * JSON strings validated by Zod on the server (and by the console's forms).
 */
export const intelTypeDefs = gql`
  type IntelMe {
    user_id: ID!
    level: String!
    can_admin: Boolean!
    can_super: Boolean!
    environments: [String!]!
    sources: [String!]!
    can_request_writes: Boolean!
  }

  type IntelModelOption {
    id: String!
    label: String!
    enabled: Boolean!
    is_default: Boolean!
  }

  type IntelSourceCard {
    source: String!
    state: String!
    connectors: Int!
    indexed: Int!
    last_sync_at: String
    detail: String!
  }

  type IntelBootstrap {
    me: IntelMe!
    app_title: String!
    description: String!
    default_environment: String!
    default_model: String!
    models: [IntelModelOption!]!
    sources: [IntelSourceCard!]!
    pending_approvals: Int!
    "Media Manager limits from Settings › Media & Uploads."
    upload_max_mb: Int!
    upload_types: [String!]!
  }

  type IntelConversation {
    id: ID!
    title: String!
    pinned: Boolean!
    archived: Boolean!
    model: String!
    environment: String!
    sources: [String!]!
    message_count: Int!
    last_message_at: String!
    created_at: String!
    updated_at: String!
  }

  type IntelConversationPage {
    total: Int!
    rows: [IntelConversation!]!
  }

  type IntelConversationCounts {
    recent: Int!
    pinned: Int!
    archived: Int!
    all: Int!
  }

  type IntelCitation {
    ref: String!
    title: String!
    url: String!
    source: String!
    environment: String!
    snippet: String!
    page: Int
    line_start: Int
    line_end: Int
  }

  type IntelToolCall {
    name: String!
    title: String!
    status: String!
    summary: String!
  }

  type IntelMessage {
    id: ID!
    conversation_id: ID!
    role: String!
    content: String!
    status: String!
    citations: [IntelCitation!]!
    tool_calls: [IntelToolCall!]!
    approval_ids: [String!]!
    model: String!
    error_code: String
    error_message: String
    edited: Boolean!
    created_at: String!
  }

  type IntelSendResult {
    conversation_id: ID!
    user_message_id: ID!
    assistant_message_id: ID!
  }

  input IntelSendInput {
    conversation_id: ID
    message: String
    model: String
    environment: String
    sources: [String!]
    edit_message_id: ID
    regenerate: Boolean
  }

  input IntelConversationPatch {
    title: String
    pinned: Boolean
    archived: Boolean
    model: String
    environment: String
    sources: [String!]
  }

  type IntelSettingsPayload {
    revision: Int!
    json: String!
  }

  type IntelEntryOption {
    id: ID!
    name: String!
    description: String!
    is_default: Boolean!
    last_test_ok: Boolean
  }

  type IntelTool {
    name: String!
    description: String!
    class: String!
    override: String
    effective: String!
    input_schema: String!
  }

  type IntelConnector {
    id: ID!
    kind: String!
    name: String!
    environment: String!
    env_entry_id: ID!
    env_entry_name: String!
    enabled: Boolean!
    config: String!
    tools: [IntelTool!]!
    status: String!
    sync_paused: Boolean!
    last_sync_at: String
    last_success_at: String
    last_error: String!
    indexed_count: Int!
    created_at: String!
    updated_at: String!
  }

  input IntelConnectorInput {
    kind: String!
    name: String!
    environment: String!
    env_entry_id: ID!
    enabled: Boolean
    "Kind-specific options as JSON (collections, channels, repositories…)."
    config: String!
  }

  type IntelTestResult {
    ok: Boolean!
    message: String!
    details: [String!]!
  }

  type IntelSlackChannel {
    id: ID!
    name: String!
    is_private: Boolean!
  }

  type IntelSyncStats {
    seen: Int!
    indexed: Int!
    unchanged: Int!
    failed: Int!
    deleted: Int!
  }

  type IntelSyncRun {
    id: ID!
    connector_id: ID!
    connector_name: String!
    kind: String!
    mode: String!
    trigger: String!
    status: String!
    stats: IntelSyncStats!
    error: String!
    log: [String!]!
    started_at: String
    finished_at: String
    created_at: String!
  }

  type IntelMedia {
    id: ID!
    owner_id: ID!
    name: String!
    folder: String!
    mime: String!
    size: Int!
    visibility: String!
    favorite: Boolean!
    archived: Boolean!
    deleted: Boolean!
    index_status: String!
    index_method: String!
    index_warning: String!
    page_count: Int!
    chunk_count: Int!
    indexed_at: String
    created_at: String!
    updated_at: String!
  }

  type IntelMediaPage {
    total: Int!
    rows: [IntelMedia!]!
  }

  input IntelMediaPatch {
    name: String
    folder: String
    visibility: String
    favorite: Boolean
  }

  type IntelApproval {
    id: ID!
    kind: String!
    status: String!
    requested_by: ID!
    conversation_id: String!
    connector_name: String!
    environment: String!
    database: String!
    collection: String!
    action: String!
    tool_class: String!
    request: String!
    preview: String!
    impact: String!
    reason: String!
    four_eyes: Boolean!
    decided_by: ID
    decided_at: String
    decision_note: String!
    result: String!
    error: String!
    expires_at: String!
    created_at: String!
  }

  type IntelAuditRow {
    id: ID!
    type: String!
    action: String!
    status: String!
    user_id: ID
    level: String!
    environment: String!
    target: String!
    detail: String!
    created_at: String!
    sealed: Boolean!
  }

  type IntelAuditPage {
    total: Int!
    rows: [IntelAuditRow!]!
  }

  type IntelIndexDocument {
    id: ID!
    source: String!
    connector_id: String!
    scope: String!
    title: String!
    url: String!
    version: Int!
    chunk_count: Int!
    status: String!
    error: String!
    indexed_at: String
  }

  type IntelIndexPage {
    total: Int!
    rows: [IntelIndexDocument!]!
  }

  type IntelIndexStat {
    source: String!
    scope: String!
    documents: Int!
    chunks: Int!
    failed: Int!
  }

  type IntelCollectionHealth {
    scope: String!
    name: String!
    exists: Boolean!
    status: String!
    points: Int!
    dimensions: Int
    dimension_mismatch: Boolean!
  }

  type IntelConnectorError {
    id: ID!
    name: String!
    kind: String!
    error: String!
  }

  type IntelHealth {
    qdrant_configured: Boolean!
    qdrant_reachable: Boolean!
    collections: [IntelCollectionHealth!]!
    queue_configured: Boolean!
    openai_configured: Boolean!
    openai_entry_selected: Boolean!
    failed_runs_24h: Int!
    pending_approvals: Int!
    connector_errors: [IntelConnectorError!]!
  }

  type IntelUsageRow {
    key: String!
    calls: Int!
    tokens: Int!
    cost_usd: Float!
  }

  type IntelUsage {
    days: Int!
    total_calls: Int!
    total_tokens: Int!
    total_cost_usd: Float!
    by_task: [IntelUsageRow!]!
    by_model: [IntelUsageRow!]!
    by_day: [IntelUsageRow!]!
  }

  extend type Query {
    intelBootstrap: IntelBootstrap!
    intelConversations(view: String, sort: String, search: String, page: Int, page_size: Int): IntelConversationPage!
    intelConversationCounts: IntelConversationCounts!
    intelConversation(id: ID!): IntelConversation!
    intelMessages(conversation_id: ID!): [IntelMessage!]!
    intelMedia(view: String, folder: String, search: String, page: Int, page_size: Int): IntelMediaPage!
    intelMediaFile(id: ID!): IntelMedia!
    intelMediaFolders: [String!]!
    intelApprovals(status: String, mine: Boolean, limit: Int): [IntelApproval!]!
    intelApproval(id: ID!): IntelApproval!

    intelSettings: IntelSettingsPayload!
    intelEntryOptions(kind: String!): [IntelEntryOption!]!
    intelConnectors(kind: String): [IntelConnector!]!
    intelConnector(id: ID!): IntelConnector!
    intelMongoCollections(entry_id: ID!, database: String): [String!]!
    intelSlackChannels(entry_id: ID!): [IntelSlackChannel!]!
    intelGithubBranches(entry_id: ID!, owner: String!, repo: String!): [String!]!
    intelSyncRuns(connector_id: ID, limit: Int): [IntelSyncRun!]!
    intelIndexDocuments(source: String, scope: String, status: String, search: String, page: Int, page_size: Int): IntelIndexPage!
    intelIndexStats: [IntelIndexStat!]!
    intelHealth: IntelHealth!
    intelAudit(type: String, status: String, search: String, page: Int, page_size: Int): IntelAuditPage!
    intelUsage(days: Int): IntelUsage!
  }

  extend type Mutation {
    intelSessionStart: Boolean!
    intelSend(input: IntelSendInput!): IntelSendResult!
    intelStop(message_id: ID!): Boolean!
    intelUpdateConversation(id: ID!, patch: IntelConversationPatch!): IntelConversation!
    intelDeleteConversation(id: ID!): Boolean!

    intelUpdateMedia(id: ID!, patch: IntelMediaPatch!): IntelMedia!
    intelArchiveMedia(id: ID!, archived: Boolean!): IntelMedia!
    intelTrashMedia(id: ID!): IntelMedia!
    intelRestoreMedia(id: ID!): IntelMedia!
    intelPurgeMedia(id: ID!): Boolean!
    intelReindexMedia(id: ID!): IntelMedia!
    intelCreateFolder(path: String!): String!

    intelDecideApproval(id: ID!, approve: Boolean!, note: String): IntelApproval!

    intelUpdateSettings(section: String!, value: String!, revision: Int!): IntelSettingsPayload!
    intelCreateConnector(input: IntelConnectorInput!): IntelConnector!
    intelUpdateConnector(id: ID!, input: IntelConnectorInput!): IntelConnector!
    intelDeleteConnector(id: ID!): Boolean!
    intelSetConnectorEnabled(id: ID!, enabled: Boolean!): IntelConnector!
    intelSetConnectorPaused(id: ID!, paused: Boolean!): IntelConnector!
    intelTestConnector(id: ID!): IntelTestResult!
    intelSyncConnector(id: ID!, full: Boolean): ID!
    intelDiscoverTools(id: ID!): IntelConnector!
    intelSetToolClass(id: ID!, tool: String!, class: String): IntelConnector!
    intelRebuildIndex(scope: String): Int!
  }
`;
