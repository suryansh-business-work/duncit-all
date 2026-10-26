import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { catalogFor, connectorLabel, connectorsFor } from '../../catalog/console.service';
import { MCP_ENDPOINTS } from '../../catalog/endpoints';
import { REFUSAL_MESSAGES } from '../../catalog/visibility';
import { buildFixtureCatalog, FINANCE_STAFF, MEMBER, PODS_STAFF, PUBLIC_URL, settings } from './fixtures';

const catalog = buildFixtureCatalog();

describe('connectorsFor', () => {
  const connectors = connectorsFor(catalog, PODS_STAFF, settings(), PUBLIC_URL);
  const byKey = (key: string) => connectors.find((connector) => connector.key === key);

  it('lists the gateway first, then every endpoint, each with its URL', () => {
    expect(connectors.map((connector) => connector.key)).toEqual([GATEWAY_ENDPOINT, ...MCP_ENDPOINTS.map((endpoint) => endpoint.key)]);
    expect(byKey(GATEWAY_ENDPOINT)?.url).toBe(`${PUBLIC_URL}/mcp`);
    expect(byKey('pods')?.url).toBe(`${PUBLIC_URL}/pods/mcp`);
  });

  it('describes the gateway as reaching every category the person has, with every tool they could use', () => {
    const gateway = byKey(GATEWAY_ENDPOINT);
    expect(gateway).toMatchObject({ label: 'Gateway — every console you have', portal: '', accessible: true });
    expect(gateway?.categories).toContain('pods');
    expect(gateway?.categories).not.toContain('finance');
    // 9 curated + 7 pods tools + clubs table + venue + chat messages (finance is not theirs).
    expect(gateway?.tool_count).toBe(19);
  });

  it('marks the endpoints the person cannot open and counts no tools for them', () => {
    expect(byKey('finance')).toMatchObject({ accessible: false, tool_count: 0, portal: 'finance', categories: ['finance'] });
  });

  it('counts the tools an open endpoint would list, judged for a read & write connection', () => {
    // 7 curated "*" tools + pods_audit_timings + 7 pods API tools (writes included).
    expect(byKey('pods')).toMatchObject({ accessible: true, tool_count: 15 });
  });

  it('respects the MCP manager’s switches when counting', () => {
    const off = connectorsFor(catalog, PODS_STAFF, settings({ write_tools_enabled: false }), PUBLIC_URL);
    expect(off.find((connector) => connector.key === 'pods')?.tool_count).toBe(11);
  });
});

describe('catalogFor', () => {
  it('returns the whole catalog with no filter, judging each tool for this person', () => {
    const result = catalogFor(catalog, MEMBER, settings(), {});
    expect(result.total).toBe(catalog.tools.length);
    const payout = result.tools.find((tool) => tool.name === 'finance_payout_summary');
    expect(payout).toMatchObject({ available: false, unavailable_reason: REFUSAL_MESSAGES.NO_PORTAL_ACCESS, endpoints: ['finance'] });
    expect(result.tools.find((tool) => tool.name === 'pods_pod')).toMatchObject({ available: true, unavailable_reason: null });
  });

  it('narrows to what one endpoint lists for the person', () => {
    const result = catalogFor(catalog, FINANCE_STAFF, settings(), { endpoint: 'finance' });
    expect(result.tools.map((tool) => tool.name)).toEqual([
      'mcp_whoami',
      'mcp_list_tools',
      'mcp_search_tools',
      'mcp_describe_tool',
      'mcp_audit_tools',
      'mcp_my_usage',
      'mcp_self_test',
      'finance_payout_summary',
      'finance_approve_payment_release',
      'finance_refund_payment',
    ]);
  });

  it('treats the gateway as the whole catalog', () => {
    expect(catalogFor(catalog, MEMBER, settings(), { endpoint: GATEWAY_ENDPOINT }).total).toBe(catalog.tools.length);
  });

  it('filters by category and by a case-insensitive search over name, title and description', () => {
    expect(catalogFor(catalog, PODS_STAFF, settings(), { category: 'finance' }).tools.map((tool) => tool.name)).toEqual([
      'finance_payout_summary',
      'finance_approve_payment_release',
      'finance_refund_payment',
    ]);
    // mcp_search_tools mentions "refund payment" as an example in its description.
    expect(catalogFor(catalog, PODS_STAFF, settings(), { search: '  REFUND ' }).tools.map((tool) => tool.name)).toEqual([
      'mcp_search_tools',
      'finance_refund_payment',
    ]);
  });

  it('counts tools per category, largest first, with labels', () => {
    const { categories } = catalogFor(catalog, PODS_STAFF, settings(), {});
    expect(categories.slice(0, 2)).toEqual([
      { category: 'mcp', label: 'MCP', tools: 8 },
      { category: 'pods', label: 'Pods', tools: 8 },
    ]);
    expect(categories.find((entry) => entry.category === 'finance')).toEqual({ category: 'finance', label: 'Finance', tools: 3 });
    const counts = categories.map((entry) => entry.tools);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('serialises each tool with its risk, confirmation and schema for the console', () => {
    const row = catalogFor(catalog, PODS_STAFF, settings(), { search: 'delete pod' }).tools[0];
    expect(row).toMatchObject({
      name: 'pods_delete_pod',
      category_label: 'Pods',
      kind: 'MUTATION',
      risk: 'DESTRUCTIVE',
      needs_confirmation: true,
      reaches_outside: false,
      endpoints: ['admin', 'app', 'partners', 'pods', 'regional-club-admin'],
    });
    expect(JSON.parse(row.input_schema).required).toEqual(['id', 'mcp_reason', 'mcp_confirm']);
  });

  it('explains a switched-off tool', () => {
    const row = catalogFor(catalog, PODS_STAFF, settings({ disabled_tools: ['pods_pod'] }), { search: 'pods_pod ' }).tools;
    expect(row.find((tool) => tool.name === 'pods_pod')).toMatchObject({ available: false, unavailable_reason: REFUSAL_MESSAGES.DISABLED });
  });

  it('returns nothing for a search that matches nothing', () => {
    expect(catalogFor(catalog, PODS_STAFF, settings(), { search: 'zzz-no-such-thing' })).toEqual({ total: 0, categories: [], tools: [] });
  });
});

describe('connectorLabel', () => {
  it('names the console a connector URL belongs to, trailing slash or not', () => {
    expect(connectorLabel(`${PUBLIC_URL}/pods/mcp`, PUBLIC_URL)).toBe('Pods console');
    expect(connectorLabel(`${PUBLIC_URL}/finance/mcp/`, `${PUBLIC_URL}/`)).toBe('Finance');
  });

  it('calls the gateway, or anything unknown, the gateway', () => {
    expect(connectorLabel(`${PUBLIC_URL}/mcp`, PUBLIC_URL)).toBe('Gateway — every console you have');
    expect(connectorLabel('https://elsewhere.example/pods/mcp', PUBLIC_URL)).toBe('Gateway — every console you have');
  });
});
