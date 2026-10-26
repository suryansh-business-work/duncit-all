import type {
  McpAuthorizationRequest,
  McpCatalog,
  McpCategoryCount,
  McpConnection,
  McpConnector,
  McpSettings,
  McpToolCall,
  McpToolInfo,
  McpUsageBucket,
  McpUsageSummary,
  McpUsageTotals,
} from '@duncit/gql-types';

/**
 * Server-shaped MCP objects, each with its `__typename` (MockedProvider adds it
 * to every document, so the cache expects it back). Typed against the generated
 * schema, so a schema change that breaks a fixture fails the typecheck.
 */

export const MCP_URL = 'https://mcp.example.test';

export const connector = (over: Partial<McpConnector> = {}): McpConnector => ({
  __typename: 'McpConnector',
  key: 'gateway',
  label: 'Gateway — every console you have',
  url: `${MCP_URL}/mcp`,
  portal: '',
  categories: ['pods', 'finance'],
  accessible: true,
  tool_count: 1240,
  ...over,
});

export const CONNECTORS: McpConnector[] = [
  connector(),
  connector({ key: 'pods', label: 'Pods console', url: `${MCP_URL}/pods/mcp`, portal: 'pods', tool_count: 1 }),
  connector({ key: 'finance', label: 'Finance console', url: `${MCP_URL}/finance/mcp`, portal: 'finance', accessible: false, tool_count: 0 }),
];

export const authRequest = (over: Partial<McpAuthorizationRequest> = {}): McpAuthorizationRequest => ({
  __typename: 'McpAuthorizationRequest',
  id: 'req-1',
  client_name: 'Claude',
  client_uri: 'https://claude.ai',
  redirect_host: 'claude.ai',
  trusted: true,
  requests_write: true,
  resource: `${MCP_URL}/mcp`,
  endpoint_label: 'Gateway — every console you have',
  expires_at: '2026-10-26T10:10:00.000Z',
  can_approve: true,
  ...over,
});

export const toolCall = (over: Partial<McpToolCall> = {}): McpToolCall => ({
  __typename: 'McpToolCall',
  id: 'call-1',
  created_at: '2026-10-26T09:30:00.000Z',
  user_id: 'user-1',
  user_email: 'asha@duncit.com',
  connection_id: 'conn-1',
  client_name: 'Claude',
  user_agent: 'Claude-User/1.0',
  ip: '203.0.113.7',
  endpoint: 'pods',
  tool: 'pods_create_pod',
  category: 'pods',
  kind: 'MUTATION',
  risk: 'WRITE',
  reason: 'Create the Sunday pottery pod the host asked for',
  args_preview: '{"title":"Sunday Pottery","spots":8}',
  status: 'OK',
  error_code: null,
  error_message: null,
  duration_ms: 412,
  input_tokens: 1200,
  output_tokens: 340,
  cost: 0.0042,
  currency: 'USD',
  injection_flags: [],
  guard_mode: 'block',
  ...over,
});

export const toolInfo = (over: Partial<McpToolInfo> = {}): McpToolInfo => ({
  __typename: 'McpToolInfo',
  name: 'pods_pods_table',
  title: 'List pods',
  description: 'Every pod, paged.\nFilter by status or club.',
  category: 'pods',
  category_label: 'Pods',
  kind: 'QUERY',
  risk: 'READ',
  needs_confirmation: false,
  reaches_outside: false,
  endpoints: ['pods', 'gateway'],
  available: true,
  unavailable_reason: null,
  input_schema: '{"type":"object","properties":{"page":{"type":"integer"}}}',
  ...over,
});

export const categoryCount = (over: Partial<McpCategoryCount> = {}): McpCategoryCount => ({
  __typename: 'McpCategoryCount',
  category: 'pods',
  label: 'Pods',
  tools: 2,
  ...over,
});

/** The Tools page's selection of a catalog: no description or schema on the rows. */
export const toolsCatalog = (tools: McpToolInfo[], categories: McpCategoryCount[]): McpCatalog => ({
  __typename: 'McpCatalog',
  total: tools.length,
  categories,
  tools,
});

export const connection = (over: Partial<McpConnection> = {}): McpConnection => ({
  __typename: 'McpConnection',
  id: 'conn-1',
  user_id: 'user-1',
  user_email: 'asha@duncit.com',
  client_id: 'client-1',
  client_name: 'Claude',
  scopes: ['mcp:read', 'mcp:write'],
  resource: `${MCP_URL}/pods/mcp`,
  status: 'ACTIVE',
  created_at: '2026-10-20T08:00:00.000Z',
  last_used_at: '2026-10-26T09:30:00.000Z',
  last_ip: '203.0.113.7',
  user_agent: 'Claude-User/1.0',
  revoked_at: null,
  revoked_reason: null,
  ...over,
});

export const settings = (over: Partial<McpSettings> = {}): McpSettings => ({
  __typename: 'McpSettings',
  write_tools_enabled: true,
  default_injection_guard: 'block',
  disabled_tools: ['pods_delete_pod'],
  disabled_categories: ['finance'],
  token_price_input_per_million: 3,
  token_price_output_per_million: 15,
  currency: 'USD',
  trusted_redirect_hosts: ['claude.ai', 'localhost', '[::1]'],
  allow_untrusted_clients: false,
  updated_at: '2026-10-20T10:00:00.000Z',
  updated_by: 'user-9',
  ...over,
});

export const bucket = (over: Partial<McpUsageBucket> = {}): McpUsageBucket => ({
  __typename: 'McpUsageBucket',
  key: 'pods_create_pod',
  calls: 10,
  errors: 1,
  blocked: 0,
  input_tokens: 12000,
  output_tokens: 3400,
  cost: 0.042,
  avg_ms: 380,
  last_at: '2026-10-26T09:30:00.000Z',
  ...over,
});

export const totals = (over: Partial<McpUsageTotals> = {}): McpUsageTotals => ({
  __typename: 'McpUsageTotals',
  calls: 1234,
  errors: 12,
  blocked: 3,
  users: 4,
  input_tokens: 56000,
  output_tokens: 7800,
  cost: 3.5,
  avg_ms: 420,
  last_at: '2026-10-26T09:30:00.000Z',
  ...over,
});

/** A usage summary as the dashboard selects it (no `from`/`to`/`time_zone`, no `last_at` on totals). */
export function usageSummary(over: Partial<McpUsageSummary> = {}) {
  const { __typename: _t, last_at: _l, ...pickedTotals } = totals();
  const day = (key: string, calls: number, errors: number) => ({ __typename: 'McpUsageBucket' as const, key, calls, errors });
  return {
    __typename: 'McpUsageSummary' as const,
    scope: 'ALL',
    totals: { __typename: 'McpUsageTotals' as const, ...pickedTotals },
    by_day: [day('2026-10-25', 4, 1), day('2026-10-26', 6, 0)],
    by_tool: [bucket()],
    by_category: [bucket({ key: 'pods' })],
    by_client: [bucket({ key: 'Claude' })],
    by_endpoint: [bucket({ key: 'pods' })],
    by_status: [bucket({ key: 'OK', calls: 9, errors: 0 }), bucket({ key: 'ERROR', calls: 1, errors: 1 })],
    by_user: [bucket({ key: 'asha@duncit.com' }), bucket({ key: 'unknown', calls: 1 })],
    ...over,
  };
}
