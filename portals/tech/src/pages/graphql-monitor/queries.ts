import { gql } from '@apollo/client';

export type MonitorRange = 'LAST_HOUR' | 'LAST_6_HOURS' | 'LAST_24_HOURS' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

export type OperationType = 'QUERY' | 'MUTATION' | 'SUBSCRIPTION' | 'UNKNOWN';

export interface LatencyNumbers {
  requests: number;
  errors: number;
  cached: number;
  error_rate_pct: number;
  rpm: number;
  avg_ms: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  parse_avg_ms: number;
  validate_avg_ms: number;
  execute_avg_ms: number;
  last_seen_at: string | null;
}

export interface OperationSummary extends LatencyNumbers {
  id: string;
  name: string;
  type: OperationType;
  root_fields: string[];
}

export interface MonitorPoint {
  at: string;
  requests: number;
  errors: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface MonitorTally {
  label: string;
  count: number;
}

export interface MonitorOverview extends LatencyNumbers {
  operation_count: number;
  series: MonitorPoint[];
  clients: MonitorTally[];
  error_codes: MonitorTally[];
}

export interface OperationDetail extends LatencyNumbers {
  id: string;
  name: string;
  type: OperationType;
  signature: string;
  root_fields: string[];
  fields: string[];
  first_seen_at: string | null;
  series: MonitorPoint[];
  latency_distribution: Array<{ le_ms: number; count: number }>;
  clients: MonitorTally[];
  error_codes: MonitorTally[];
}

export interface ResolverTiming {
  path: string;
  parent_type: string;
  field_name: string;
  return_type: string;
  start_ms: number;
  duration_ms: number;
  error: string | null;
}

export interface MonitorTrace {
  id: string;
  op_key: string;
  at: string | null;
  duration_ms: number;
  parse_ms: number;
  validate_ms: number;
  execute_ms: number;
  client: string;
  error_messages: string[];
  resolver_count: number;
  resolvers?: ResolverTiming[] | null;
}

export interface FieldUsage {
  coordinate: string;
  parent_type: string;
  field_name: string;
  kind: 'QUERY' | 'MUTATION' | 'SUBSCRIPTION' | 'TYPE';
  return_type: string;
  arguments: string[];
  description: string;
  deprecation_reason: string | null;
  referenced: number;
  sampled_calls: number;
  error_rate_pct: number;
  avg_ms: number;
  max_ms: number;
  last_seen_at: string | null;
}

export interface ErrorGroup {
  id: string;
  operation_id: string;
  operation_name: string;
  code: string;
  path: string;
  message: string;
  count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface MonitorSettings {
  enabled: boolean;
  field_sample_pct: number;
  retention_days: number;
  slow_threshold_ms: number;
  updated_at: string | null;
}

const LATENCY_FIELDS = `
  requests errors cached error_rate_pct rpm avg_ms p50_ms p90_ms p95_ms p99_ms max_ms
  parse_avg_ms validate_avg_ms execute_avg_ms last_seen_at
`;

const SERIES_FIELDS = 'series { at requests errors p50_ms p95_ms p99_ms }';

const TALLY_FIELDS = 'clients { label count } error_codes { label count }';

const SETTINGS_FIELDS = 'enabled field_sample_pct retention_days slow_threshold_ms updated_at';

const TRACE_FIELDS = 'id op_key at duration_ms parse_ms validate_ms execute_ms client error_messages resolver_count';

export const GRAPHQL_MONITOR_OVERVIEW = gql`
  query GraphqlMonitorOverview($range: String) {
    graphqlMonitorOverview(range: $range) {
      ${LATENCY_FIELDS}
      operation_count
      ${SERIES_FIELDS}
      ${TALLY_FIELDS}
    }
  }
`;

export const GRAPHQL_MONITOR_OPERATIONS = gql`
  query GraphqlMonitorOperations($range: String) {
    graphqlMonitorOperations(range: $range) {
      id name type root_fields
      ${LATENCY_FIELDS}
    }
  }
`;

export const GRAPHQL_MONITOR_OPERATION = gql`
  query GraphqlMonitorOperation($id: ID!, $range: String) {
    graphqlMonitorOperation(id: $id, range: $range) {
      id name type signature root_fields fields first_seen_at
      ${LATENCY_FIELDS}
      ${SERIES_FIELDS}
      latency_distribution { le_ms count }
      ${TALLY_FIELDS}
    }
  }
`;

export const GRAPHQL_MONITOR_TRACES = gql`
  query GraphqlMonitorTraces($operation_id: ID!) {
    graphqlMonitorTraces(operation_id: $operation_id) { ${TRACE_FIELDS} }
  }
`;

export const GRAPHQL_MONITOR_TRACE = gql`
  query GraphqlMonitorTrace($id: ID!) {
    graphqlMonitorTrace(id: $id) {
      ${TRACE_FIELDS}
      resolvers { path parent_type field_name return_type start_ms duration_ms error }
    }
  }
`;

export const GRAPHQL_MONITOR_FIELDS = gql`
  query GraphqlMonitorFields($range: String) {
    graphqlMonitorFields(range: $range) {
      coordinate parent_type field_name kind return_type arguments description deprecation_reason
      referenced sampled_calls error_rate_pct avg_ms max_ms last_seen_at
    }
  }
`;

export const GRAPHQL_MONITOR_ERRORS = gql`
  query GraphqlMonitorErrors($range: String) {
    graphqlMonitorErrors(range: $range) {
      id operation_id operation_name code path message count first_seen_at last_seen_at
    }
  }
`;

export const GRAPHQL_MONITOR_SETTINGS = gql`
  query GraphqlMonitorSettings {
    graphqlMonitorSettings { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_GRAPHQL_MONITOR_SETTINGS = gql`
  mutation UpdateGraphqlMonitorSettings($input: GraphqlMonitorSettingsInput!) {
    updateGraphqlMonitorSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;
