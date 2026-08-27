import gql from 'graphql-tag';

export const rateLimitTypeDefs = gql`
  """
  One rate limiting rule.

  A rule answers four questions: which traffic it governs (surface / app /
  channel / operation), what the allowance is (limit per window, by algorithm),
  who the allowance is counted per (key_by), and what happens on a breach
  (mode, block_seconds, message).
  """
  type RateLimitRule {
    id: ID!
    name: String!
    description: String
    enabled: Boolean!
    "ENFORCE refuses the request. MONITOR records the breach and lets it through."
    mode: String!
    "Lower runs first. Every matching rule is still evaluated, so ceilings stack."
    priority: Int!

    "NATIVE | MWEB | PORTAL | ADMIN_PORTAL | WEBSITE | API | SERVER | UNKNOWN | ALL."
    surface: String!
    "The app key within that surface (tech, finance, mweb, native), or * for all."
    app: String!
    "GRAPHQL | REST | SOCKET | ALL."
    channel: String!
    "ALL | ANONYMOUS | AUTHENTICATED."
    audience: String!
    "GraphQL field names; * wildcards allowed. Empty means every field."
    operations: [String!]!
    "ALL | QUERY | MUTATION | SUBSCRIPTION."
    operation_type: String!
    "REST path globs such as /upload*. Empty means every path."
    paths: [String!]!
    "HTTP methods. Empty means every method."
    methods: [String!]!

    "IP | USER | DEVICE | IP_USER | API_KEY | SYSTEM | GLOBAL."
    key_by: String!
    "FIXED_WINDOW | SLIDING_WINDOW | TOKEN_BUCKET."
    algorithm: String!
    limit: Int!
    window_seconds: Int!
    "TOKEN_BUCKET only: how far above the limit one burst may go."
    burst: Int!
    "Cool-off after a breach, in seconds. 0 means the window alone is the penalty."
    block_seconds: Int!

    exempt_roles: [String!]!
    "Addresses this rule never applies to. Globs allowed, so a /24 is 10.1.2.*"
    exempt_ips: [String!]!

    "What a refused caller is told. Falls back to the platform default."
    message: String
    notify_slack: Boolean!

    hit_count: Int!
    blocked_count: Int!
    last_hit_at: String
    last_blocked_at: String
    created_at: String
    updated_at: String
  }

  type RateLimitRulePage {
    total: Int!
    rows: [RateLimitRule!]!
  }

  """
  One system the server has been called by: a portal, mWeb, the app, a website,
  an API-key integration. Written by the traffic itself, so a surface added
  later appears here the first time it calls.
  """
  type RateLimitSystem {
    id: ID!
    surface: String!
    app: String!
    label: String!
    requests: Int!
    blocked: Int!
    "How many enabled rules could govern this system today."
    rule_count: Int!
    last_seen_at: String
  }

  "One breach: a request refused, or one a MONITOR rule recorded and let through."
  type RateLimitEvent {
    id: ID!
    rule_id: ID!
    rule_name: String!
    mode: String!
    surface: String!
    app: String!
    channel: String!
    operation: String
    path: String
    method: String
    "The identity the allowance was counted per, e.g. ip:203.0.113.4"
    limit_key: String!
    key_by: String!
    ip: String
    user_id: ID
    user_email: String
    device_id: String
    user_agent: String
    count: Int!
    limit: Int!
    retry_after: Int!
    created_at: String
  }

  type RateLimitEventPage {
    total: Int!
    rows: [RateLimitEvent!]!
  }

  type RateLimitSettings {
    "Master switch. Off means every request passes, whatever the rules say."
    enabled: Boolean!
    "Forces every rule to MONITOR without editing any of them."
    monitor_only: Boolean!
    default_message: String!
    "Send X-RateLimit-Limit / -Remaining / -Reset and Retry-After."
    send_headers: Boolean!
    log_blocks: Boolean!
    notify_slack: Boolean!
    exempt_roles: [String!]!
    allow_ips: [String!]!
    block_ips: [String!]!
    event_retention_days: Int!
    """
    REDIS or MEMORY — where the counters actually live right now.

    Not a setting: it is read from the live connection. MEMORY means the count
    is per server process, which is the right answer for one container and the
    wrong one the moment there are two.
    """
    store: String!
    rule_count: Int!
    active_rule_count: Int!
    event_count: Int!
    updated_at: String
  }

  type RateLimitTally {
    label: String!
    count: Int!
  }

  type RateLimitStats {
    store: String!
    blocked_24h: Int!
    monitored_24h: Int!
    top_rules: [RateLimitTally!]!
    top_systems: [RateLimitTally!]!
  }

  "One selectable app, as the systems collection knows it."
  type RateLimitAppOption {
    surface: String!
    app: String!
    label: String!
  }

  type RateLimitRoleOption {
    key: String!
    name: String!
  }

  """
  The vocabulary the rule editor renders.

  Served rather than hardcoded in the portal, so a value added on the server
  becomes an option in the editor without a portal release.
  """
  type RateLimitOptions {
    surfaces: [String!]!
    channels: [String!]!
    key_by: [String!]!
    algorithms: [String!]!
    modes: [String!]!
    audiences: [String!]!
    operation_types: [String!]!
    apps: [RateLimitAppOption!]!
    roles: [RateLimitRoleOption!]!
  }

  input RateLimitRuleInput {
    name: String
    description: String
    enabled: Boolean
    mode: String
    priority: Int
    surface: String
    app: String
    channel: String
    audience: String
    operations: [String!]
    operation_type: String
    paths: [String!]
    methods: [String!]
    key_by: String
    algorithm: String
    limit: Int
    window_seconds: Int
    burst: Int
    block_seconds: Int
    exempt_roles: [String!]
    exempt_ips: [String!]
    message: String
    notify_slack: Boolean
  }

  input RateLimitSettingsInput {
    enabled: Boolean
    monitor_only: Boolean
    default_message: String
    send_headers: Boolean
    log_blocks: Boolean
    notify_slack: Boolean
    exempt_roles: [String!]
    allow_ips: [String!]
    block_ips: [String!]
    event_retention_days: Int
  }

  extend type Query {
    "Master settings plus the live store engine and the current counts."
    rateLimitSettings: RateLimitSettings!
    "Every rule, in evaluation order. For the editor's priority preview."
    rateLimitRules: [RateLimitRule!]!
    "Server-side table page for the rules table."
    rateLimitRulesTable(query: TableQueryInput): RateLimitRulePage!
    rateLimitRule(rule_id: ID!): RateLimitRule
    "Every system that has called, with what it has spent."
    rateLimitSystems: [RateLimitSystem!]!
    "Server-side table page for the blocked-traffic table."
    rateLimitEventsTable(query: TableQueryInput): RateLimitEventPage!
    "Last 24 hours: refusals, recorded breaches, and who is causing them."
    rateLimitStats: RateLimitStats!
    "The enum lists and the known apps and roles the rule editor renders."
    rateLimitOptions: RateLimitOptions!
  }

  extend type Mutation {
    createRateLimitRule(input: RateLimitRuleInput!): RateLimitRule!
    updateRateLimitRule(rule_id: ID!, input: RateLimitRuleInput!): RateLimitRule!
    setRateLimitRuleEnabled(rule_id: ID!, enabled: Boolean!): RateLimitRule!
    deleteRateLimitRule(rule_id: ID!): Boolean!
    "Zero one rule's lifetime hit/blocked counters without changing what it does."
    resetRateLimitRuleCounters(rule_id: ID!): RateLimitRule!
    updateRateLimitSettings(input: RateLimitSettingsInput!): RateLimitSettings!
    """
    Forget every live counter and cool-off.

    The way out of a cool-off somebody is stuck in after a rule was tightened
    too far. Rules and settings are untouched.
    """
    resetRateLimitCounters: Boolean!
    "Delete every recorded breach. Returns how many rows went."
    clearRateLimitEvents: Int!
  }
`;
