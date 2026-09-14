import gql from 'graphql-tag';

export const graphqlMonitorTypeDefs = gql`
  """
  How one operation (or every operation together) performed over a range.
  Percentiles are read off a summed latency histogram, accurate to ±10%.
  """
  type GraphqlOperationSummary {
    "The operation's signature hash — stable across requests and deploys."
    id: ID!
    name: String!
    "QUERY | MUTATION | SUBSCRIPTION | UNKNOWN (a request that never became an operation)."
    type: String!
    root_fields: [String!]!
    requests: Float!
    "Requests that answered with at least one error."
    errors: Float!
    "Requests answered from the response cache without executing."
    cached: Float!
    error_rate_pct: Float!
    "Requests per minute, averaged over the range."
    rpm: Float!
    avg_ms: Float!
    p50_ms: Float!
    p90_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    max_ms: Float!
    parse_avg_ms: Float!
    validate_avg_ms: Float!
    execute_avg_ms: Float!
    last_seen_at: String
  }

  type GraphqlMonitorPoint {
    at: String!
    requests: Float!
    errors: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
  }

  type GraphqlMonitorTally {
    label: String!
    count: Float!
  }

  type GraphqlLatencyBucket {
    "The slowest duration this bucket holds."
    le_ms: Float!
    count: Float!
  }

  type GraphqlMonitorOverview {
    requests: Float!
    errors: Float!
    cached: Float!
    error_rate_pct: Float!
    rpm: Float!
    avg_ms: Float!
    p50_ms: Float!
    p90_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    max_ms: Float!
    parse_avg_ms: Float!
    validate_avg_ms: Float!
    execute_avg_ms: Float!
    last_seen_at: String
    "Distinct operations seen in the range."
    operation_count: Int!
    series: [GraphqlMonitorPoint!]!
    "SURFACE:app, as the rate limiter names callers."
    clients: [GraphqlMonitorTally!]!
    error_codes: [GraphqlMonitorTally!]!
  }

  type GraphqlOperationDetail {
    id: ID!
    name: String!
    type: String!
    "The document as the server keys it: literals blanked, whitespace removed."
    signature: String!
    root_fields: [String!]!
    "Every Type.field the document selects."
    fields: [String!]!
    first_seen_at: String
    requests: Float!
    errors: Float!
    cached: Float!
    error_rate_pct: Float!
    rpm: Float!
    avg_ms: Float!
    p50_ms: Float!
    p90_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    max_ms: Float!
    parse_avg_ms: Float!
    validate_avg_ms: Float!
    execute_avg_ms: Float!
    last_seen_at: String
    series: [GraphqlMonitorPoint!]!
    latency_distribution: [GraphqlLatencyBucket!]!
    clients: [GraphqlMonitorTally!]!
    error_codes: [GraphqlMonitorTally!]!
  }

  type GraphqlResolverTiming {
    path: String!
    parent_type: String!
    field_name: String!
    return_type: String!
    "Milliseconds from the start of the request."
    start_ms: Float!
    duration_ms: Float!
    error: String
  }

  "The slowest sampled request of one operation in one hour."
  type GraphqlTrace {
    id: ID!
    op_key: String!
    at: String
    duration_ms: Float!
    parse_ms: Float!
    validate_ms: Float!
    execute_ms: Float!
    client: String!
    error_messages: [String!]!
    resolver_count: Int!
    "Only on graphqlMonitorTrace — the list query leaves it out."
    resolvers: [GraphqlResolverTiming!]
  }

  "One field of the schema with how much it was used."
  type GraphqlFieldUsage {
    coordinate: String!
    parent_type: String!
    field_name: String!
    "QUERY | MUTATION | SUBSCRIPTION for root fields, TYPE for every other."
    kind: String!
    return_type: String!
    arguments: [String!]!
    description: String!
    deprecation_reason: String
    "Operations that selected this field — exact."
    referenced: Float!
    "Resolver calls timed on sampled requests."
    sampled_calls: Float!
    error_rate_pct: Float!
    avg_ms: Float!
    max_ms: Float!
    last_seen_at: String
  }

  "Errors grouped by operation, code, path and message shape."
  type GraphqlErrorGroup {
    id: ID!
    operation_id: String!
    operation_name: String!
    code: String!
    path: String!
    message: String!
    count: Float!
    first_seen_at: String
    last_seen_at: String
  }

  type GraphqlMonitorSettings {
    "Off means requests are not measured at all."
    enabled: Boolean!
    "Share of requests whose resolvers are timed (field latency and traces)."
    field_sample_pct: Int!
    "How long hourly rollups, errors and traces are kept. Minute rollups keep 48 hours."
    retention_days: Int!
    "p95 above this marks an operation slow in the console."
    slow_threshold_ms: Int!
    updated_at: String
  }

  input GraphqlMonitorSettingsInput {
    enabled: Boolean!
    field_sample_pct: Int!
    retention_days: Int!
    slow_threshold_ms: Int!
  }

  extend type Query {
    "range: LAST_HOUR | LAST_6_HOURS | LAST_24_HOURS | LAST_7_DAYS | LAST_30_DAYS (default LAST_24_HOURS)."
    graphqlMonitorOverview(range: String): GraphqlMonitorOverview!
    graphqlMonitorOperations(range: String): [GraphqlOperationSummary!]!
    graphqlMonitorOperation(id: ID!, range: String): GraphqlOperationDetail!
    "Slowest sampled traces of one operation, slowest first."
    graphqlMonitorTraces(operation_id: ID!): [GraphqlTrace!]!
    graphqlMonitorTrace(id: ID!): GraphqlTrace!
    "Every field in the schema, used or not."
    graphqlMonitorFields(range: String): [GraphqlFieldUsage!]!
    graphqlMonitorErrors(range: String): [GraphqlErrorGroup!]!
    graphqlMonitorSettings: GraphqlMonitorSettings!
  }

  extend type Mutation {
    updateGraphqlMonitorSettings(input: GraphqlMonitorSettingsInput!): GraphqlMonitorSettings!
  }
`;
