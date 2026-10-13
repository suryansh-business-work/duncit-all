import type {
  ErrorGroup,
  FieldUsage,
  MonitorTrace,
  OperationDetail,
  OperationSummary,
} from '../../src/pages/graphql-monitor/queries';

const numbers = {
  requests: 12000,
  errors: 600,
  cached: 100,
  error_rate_pct: 5,
  rpm: 40,
  avg_ms: 120,
  p50_ms: 80,
  p90_ms: 200,
  p95_ms: 900,
  p99_ms: 1800,
  max_ms: 4000,
  parse_avg_ms: 2,
  validate_avg_ms: 3,
  execute_avg_ms: 100,
  last_seen_at: '2026-01-01T10:00:00.000Z',
};

export const monitorOperation = (over: Partial<OperationSummary> = {}): OperationSummary => ({
  id: 'op1',
  name: 'GetPods',
  type: 'QUERY',
  root_fields: ['pods'],
  ...numbers,
  ...over,
});

export const monitorDetail = (over: Partial<OperationDetail> = {}): OperationDetail => ({
  ...monitorOperation(),
  signature: 'query GetPods { pods { id } }',
  fields: ['Query.pods', 'Pod.id'],
  first_seen_at: '2025-12-01T00:00:00.000Z',
  series: [
    { at: '2026-01-01T09:00:00.000Z', requests: 100, errors: 5, p50_ms: 80, p95_ms: 400, p99_ms: 800 },
    { at: '2026-01-01T10:00:00.000Z', requests: 120, errors: 1, p50_ms: 70, p95_ms: 300, p99_ms: 600 },
  ],
  latency_distribution: [
    { le_ms: 100, count: 50 },
    { le_ms: 500, count: 20 },
  ],
  clients: [{ label: 'mweb', count: 90 }],
  error_codes: [{ label: 'INTERNAL', count: 5 }],
  ...over,
});

export const monitorTrace = (over: Partial<MonitorTrace> = {}): MonitorTrace => ({
  id: 'tr1',
  op_key: 'GetPods',
  at: '2026-01-01T10:00:00.000Z',
  duration_ms: 1500,
  parse_ms: 2,
  validate_ms: 3,
  execute_ms: 1400,
  client: 'mweb',
  error_messages: ['boom', 'boom'],
  resolver_count: 2,
  resolvers: [
    { path: 'pods', parent_type: 'Query', field_name: 'pods', return_type: '[Pod]', start_ms: 0, duration_ms: 1300, error: null },
    { path: 'pods.0.owner', parent_type: 'Pod', field_name: 'owner', return_type: 'User', start_ms: 10, duration_ms: 200, error: 'not found' },
  ],
  ...over,
});

export const monitorField = (over: Partial<FieldUsage> = {}): FieldUsage => ({
  coordinate: 'Query.pods',
  parent_type: 'Query',
  field_name: 'pods',
  kind: 'QUERY',
  return_type: '[Pod]',
  arguments: ['first', 'after'],
  description: 'All pods',
  deprecation_reason: null,
  referenced: 10,
  sampled_calls: 100,
  error_rate_pct: 1,
  avg_ms: 12,
  max_ms: 90,
  last_seen_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

export const monitorError = (over: Partial<ErrorGroup> = {}): ErrorGroup => ({
  id: 'er1',
  operation_id: 'op1',
  operation_name: 'GetPods',
  code: 'INTERNAL_SERVER_ERROR',
  path: 'pods.0.owner',
  message: 'Cannot read owner',
  count: 17,
  first_seen_at: '2026-01-01T08:00:00.000Z',
  last_seen_at: '2026-01-01T10:00:00.000Z',
  ...over,
});
