import { MCP_CATEGORIES } from '../../catalog/categories';
import { endpointsForCategory, MCP_ENDPOINTS } from '../../catalog/endpoints';
import { ToolInputError } from '../../execute/validate';
import { auditToolsTool } from '../../tools/meta/audit.tool';
import type { McpCatalog } from '../../tools/tool.types';
import { buildFixtureCatalog, PODS_STAFF, PUBLIC_URL, READ_ONLY, settings, toolContext } from './fixtures';

interface CatalogAudit {
  total_tools: number;
  by_kind: Record<string, number>;
  by_risk: Record<string, number>;
  needing_confirmation: number;
  reaching_outside_duncit: number;
  categories: Array<{ category: string; label: string; tools: number; by_risk: Record<string, number>; served_on: string[] }>;
  connectors: Array<{ key: string; label: string; url: string; categories: readonly string[]; tools: number }>;
  not_exposed: { total: number; by_reason: Array<{ reason: string; count: number; examples: string[] }> };
}
interface Report {
  catalog: CatalogAudit;
  switches: Record<string, unknown>;
  mine?: { usable_tools: number; hidden_tools: Record<string, number>; connectors: Array<{ key: string; url: string; tools: number }> };
}

const catalog = buildFixtureCatalog();
const audit = async (args: Record<string, unknown> = {}, options: Parameters<typeof toolContext>[0] = {}) =>
  (await auditToolsTool.run(toolContext({ user: PODS_STAFF, catalog, ...options }), args)) as Report;

describe('mcp_audit_tools — the catalog', () => {
  it('counts every tool by kind and risk', async () => {
    const { catalog: report } = await audit({ scope: 'catalog' });
    expect(report.total_tools).toBe(22);
    expect(report.by_kind).toEqual({ CURATED: 9, QUERY: 7, MUTATION: 6 });
    expect(report.by_risk).toEqual({ READ: 16, WRITE: 4, DESTRUCTIVE: 2 });
  });

  it('counts the tools that need a yes and the ones that reach outside Duncit', async () => {
    const { catalog: report } = await audit({ scope: 'catalog' });
    expect(report.needing_confirmation).toBe(3);
    expect(report.reaching_outside_duncit).toBe(2);
  });

  it('reports every category, with its risk split and where it is served', async () => {
    const { catalog: report } = await audit({ scope: 'catalog' });
    expect(report.categories.map((entry) => entry.category)).toEqual(MCP_CATEGORIES.map((category) => category.key));
    expect(report.categories.find((entry) => entry.category === 'pods')).toEqual({
      category: 'pods',
      label: 'Pods',
      tools: 8,
      by_risk: { READ: 4, WRITE: 3, DESTRUCTIVE: 1 },
      served_on: endpointsForCategory('pods'),
    });
    expect(report.categories.find((entry) => entry.category === 'hr')).toMatchObject({ tools: 0, by_risk: {} });
  });

  it('counts the API tools each connector serves, with its URL', async () => {
    const { catalog: report } = await audit({ scope: 'catalog' });
    const byKey = Object.fromEntries(report.connectors.map((connector) => [connector.key, connector]));
    expect(report.connectors).toHaveLength(MCP_ENDPOINTS.length);
    expect(byKey.pods).toMatchObject({ tools: 7, url: `${PUBLIC_URL}/pods/mcp`, label: 'Pods console' });
    expect(byKey.admin.tools).toBe(9);
    expect(byKey.finance.tools).toBe(3);
    expect(byKey.mcp.tools).toBe(0);
  });

  it('lists the deliberately unexposed fields grouped by reason, most common first', async () => {
    const { catalog: report } = await audit({ scope: 'catalog' });
    expect(report.not_exposed).toEqual({
      total: 6,
      by_reason: [
        { reason: 'its module is not exposed to MCP', count: 4, examples: ['_empty', '_empty', 'login', 'verifyOtp'] },
        { reason: 'returns TURN relay credentials', count: 1, examples: ['staffCallIceServers'] },
        { reason: 'passwords are set by the person', count: 1, examples: ['resetUserPassword'] },
      ],
    });
  });

  it('shows at most five examples per reason, but the full count', async () => {
    const many: McpCatalog = {
      ...catalog,
      skipped: Array.from({ length: 7 }, (_, i) => ({ field: `field${i}`, kind: 'QUERY' as const, module: 'authTypeDefs', reason: 'its module is not exposed to MCP' })),
    };
    const { catalog: report } = await audit({ scope: 'catalog' }, { catalog: many });
    expect(report.not_exposed.by_reason).toEqual([
      { reason: 'its module is not exposed to MCP', count: 7, examples: ['field0', 'field1', 'field2', 'field3', 'field4'] },
    ]);
  });

  it('shows the switches an MCP manager has thrown', async () => {
    const report = await audit(
      { scope: 'catalog' },
      { settings: settings({ write_tools_enabled: false, default_injection_guard: 'warn', disabled_tools: ['pods_pod'], disabled_categories: ['chat'] }) }
    );
    expect(report.switches).toEqual({ write_tools_enabled: false, default_injection_guard: 'warn', disabled_tools: ['pods_pod'], disabled_categories: ['chat'] });
  });

  it('leaves out the personal section for scope "catalog"', async () => {
    expect(await audit({ scope: 'catalog' })).not.toHaveProperty('mine');
  });
});

describe('mcp_audit_tools — scope "mine"', () => {
  it('is the default scope', async () => {
    expect(await audit()).toHaveProperty('mine');
  });

  it('says how many tools the person can use and why each of the rest is hidden', async () => {
    const { mine } = await audit();
    expect(mine?.usable_tools).toBe(19);
    expect(mine?.hidden_tools).toEqual({ DISABLED: 0, READ_ONLY_CONNECTION: 0, WRITES_DISABLED: 0, NO_PORTAL_ACCESS: 3 });
  });

  it('accounts for every tool on a read-only connection', async () => {
    const { mine } = await audit({}, { scopes: READ_ONLY });
    expect(mine?.hidden_tools).toEqual({ DISABLED: 0, READ_ONLY_CONNECTION: 6, WRITES_DISABLED: 0, NO_PORTAL_ACCESS: 1 });
    expect((mine?.usable_tools ?? 0) + Object.values(mine?.hidden_tools ?? {}).reduce((a, b) => a + b, 0)).toBe(22);
  });

  it('counts switched-off tools and categories, and writes switched off', async () => {
    const { mine } = await audit({}, { settings: settings({ disabled_tools: ['pods_pod'], disabled_categories: ['chat'], write_tools_enabled: false }) });
    expect(mine?.hidden_tools).toMatchObject({ DISABLED: 2, WRITES_DISABLED: 6 });
  });

  it('lists the person’s own connectors with what each would list', async () => {
    const { mine } = await audit();
    expect(mine?.connectors).toEqual([
      { key: 'app', url: `${PUBLIC_URL}/app/mcp`, tools: 16 },
      { key: 'partners', url: `${PUBLIC_URL}/partners/mcp`, tools: 16 },
      { key: 'pods', url: `${PUBLIC_URL}/pods/mcp`, tools: 15 },
      { key: 'mcp', url: `${PUBLIC_URL}/mcp/mcp`, tools: 7 },
    ]);
  });

  it.each([[{ scope: 'everyone' }], [{ scope: 'mine', extra: 1 }]])('refuses invalid arguments %j', async (args) => {
    await expect(audit(args)).rejects.toBeInstanceOf(ToolInputError);
  });
});
