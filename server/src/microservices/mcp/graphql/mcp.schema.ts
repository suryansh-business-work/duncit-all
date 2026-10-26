export const mcpTypeDefs = /* GraphQL */ `
  "One MCP connector URL — the gateway, or one console's own."
  type McpConnector {
    key: String!
    label: String!
    url: String!
    "The console whose access opens it (empty for the gateway)."
    portal: String!
    categories: [String!]!
    "Whether the signed-in person can open it."
    accessible: Boolean!
    "Tools this person would see on it with a read & write connection."
    tool_count: Int!
  }

  "One MCP tool, as the console's Tools page lists it."
  type McpToolInfo {
    name: String!
    title: String!
    description: String!
    category: String!
    category_label: String!
    "QUERY, MUTATION or CURATED."
    kind: String!
    "READ, WRITE or DESTRUCTIVE."
    risk: String!
    needs_confirmation: Boolean!
    reaches_outside: Boolean!
    "Connector keys that list it (gateway reaches every tool through mcp_call_tool)."
    endpoints: [String!]!
    "Whether the signed-in person could use it on a read & write connection."
    available: Boolean!
    unavailable_reason: String
    "The tool's parameters as a JSON Schema document (JSON text)."
    input_schema: String!
  }

  type McpCategoryCount {
    category: String!
    label: String!
    tools: Int!
  }

  type McpCatalog {
    total: Int!
    categories: [McpCategoryCount!]!
    tools: [McpToolInfo!]!
  }

  "One bucket of the usage dashboard — a tool, a category, an app, a connector, a day or a person."
  type McpUsageBucket {
    key: String!
    calls: Int!
    errors: Int!
    blocked: Int!
    input_tokens: Int!
    output_tokens: Int!
    cost: Float!
    avg_ms: Int!
    last_at: String
  }

  type McpUsageTotals {
    calls: Int!
    errors: Int!
    blocked: Int!
    users: Int!
    input_tokens: Int!
    output_tokens: Int!
    cost: Float!
    avg_ms: Int!
    last_at: String
  }

  type McpUsageSummary {
    "ALL for MCP managers, MINE for everyone else."
    scope: String!
    from: String!
    to: String!
    time_zone: String!
    totals: McpUsageTotals!
    by_tool: [McpUsageBucket!]!
    by_category: [McpUsageBucket!]!
    by_client: [McpUsageBucket!]!
    by_endpoint: [McpUsageBucket!]!
    by_status: [McpUsageBucket!]!
    by_day: [McpUsageBucket!]!
    "MCP managers only — empty for everyone else."
    by_user: [McpUsageBucket!]!
  }

  "One MCP tool call — who, which tool, from which app, why, with what, and how it went."
  type McpToolCall {
    id: ID!
    created_at: String!
    user_id: ID!
    user_email: String
    connection_id: ID
    client_name: String!
    user_agent: String
    ip: String
    endpoint: String!
    tool: String!
    category: String!
    kind: String!
    risk: String!
    "The reason the AI gave (mcp_reason)."
    reason: String
    "The arguments as JSON — credentials redacted, long values cut."
    args_preview: String!
    "OK, ERROR, DENIED, BLOCKED or INVALID."
    status: String!
    error_code: String
    error_message: String
    duration_ms: Int!
    input_tokens: Int!
    output_tokens: Int!
    cost: Float!
    currency: String!
    injection_flags: [String!]!
    guard_mode: String!
  }

  type McpToolCallTablePage {
    rows: [McpToolCall!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One approved AI app connection."
  type McpConnection {
    id: ID!
    user_id: ID!
    user_email: String
    client_id: String!
    client_name: String!
    scopes: [String!]!
    resource: String!
    "ACTIVE, REVOKED or EXPIRED."
    status: String!
    created_at: String!
    last_used_at: String
    last_ip: String
    user_agent: String
    revoked_at: String
    revoked_reason: String
  }

  type McpConnectionTablePage {
    rows: [McpConnection!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type McpSettings {
    write_tools_enabled: Boolean!
    "block or warn."
    default_injection_guard: String!
    disabled_tools: [String!]!
    disabled_categories: [String!]!
    token_price_input_per_million: Float!
    token_price_output_per_million: Float!
    currency: String!
    trusted_redirect_hosts: [String!]!
    allow_untrusted_clients: Boolean!
    updated_at: String
    updated_by: ID
  }

  input McpSettingsInput {
    write_tools_enabled: Boolean
    default_injection_guard: String
    disabled_tools: [String!]
    disabled_categories: [String!]
    token_price_input_per_million: Float
    token_price_output_per_million: Float
    currency: String
    trusted_redirect_hosts: [String!]
    allow_untrusted_clients: Boolean
  }

  "What the consent page shows before the person approves an AI app."
  type McpAuthorizationRequest {
    id: ID!
    client_name: String!
    client_uri: String
    "Where the app sends the person back after approving."
    redirect_host: String!
    "Whether that host is on the MCP settings' trusted list."
    trusted: Boolean!
    requests_write: Boolean!
    resource: String!
    endpoint_label: String!
    expires_at: String!
    "False when this account has no MCP role — it may only decline."
    can_approve: Boolean!
  }

  type McpAuthorizationDecision {
    "Send the browser here to finish."
    redirect_url: String!
  }

  extend type Query {
    "Every MCP connector URL, and which of them the signed-in person can open."
    mcpConnectors: [McpConnector!]!
    "The tool catalog, optionally for one connector or category, or matching a word."
    mcpCatalog(endpoint: String, category: String, search: String): McpCatalog!
    "The usage dashboard. Everyone sees their own; MCP managers see everyone (or one person)."
    mcpUsageSummary(from: String, to: String, user_id: ID): McpUsageSummary!
    "Activity — every tool call, newest first (own calls, or everyone's for MCP managers)."
    mcpToolCallsTable(query: TableQueryInput): McpToolCallTablePage!
    mcpToolCall(id: ID!): McpToolCall
    myMcpConnections: [McpConnection!]!
    "Connections — own, or everyone's for MCP managers."
    mcpConnectionsTable(query: TableQueryInput): McpConnectionTablePage!
    "MCP managers only."
    mcpSettings: McpSettings!
    mcpAuthorizationRequest(id: ID!): McpAuthorizationRequest!
  }

  extend type Mutation {
    "Approve an AI app on the consent page. allow_write grants tools that change data."
    approveMcpAuthorization(id: ID!, allow_write: Boolean!): McpAuthorizationDecision!
    denyMcpAuthorization(id: ID!): McpAuthorizationDecision!
    "End a connection — your own, or anyone's for MCP managers."
    revokeMcpConnection(id: ID!): McpConnection!
    "MCP managers only."
    updateMcpSettings(input: McpSettingsInput!): McpSettings!
  }
`;
