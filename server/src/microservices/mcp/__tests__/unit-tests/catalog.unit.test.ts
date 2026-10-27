import type { CatalogSource } from '../../catalog/build';
import { CURATED_TOOLS } from '../../tools/curated';
import { FIXTURE_RESOLVERS, FIXTURE_TYPE_DEFS } from './fixtures';

type CatalogModule = typeof import('../../catalog/catalog');

/** A fresh copy of the module, so its process-wide state starts empty. */
function freshCatalogModule(): CatalogModule {
  let mod: CatalogModule | undefined;
  jest.isolateModules(() => {
    mod = require('../../catalog/catalog') as CatalogModule;
  });
  if (!mod) throw new Error('catalog module did not load');
  return mod;
}

const FIXTURE: CatalogSource = { typeDefsByModule: FIXTURE_TYPE_DEFS, resolvers: FIXTURE_RESOLVERS };
const CURATED_NAMES = CURATED_TOOLS.map((tool) => tool.name);

describe('getCatalog', () => {
  it('refuses to build before the server registered a source', () => {
    const { getCatalog } = freshCatalogModule();
    expect(() => getCatalog()).toThrow('The MCP catalog has no source yet — registerCatalogSource runs at server start');
  });

  it('builds the curated tools first, then one tool per exposed API field', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource(FIXTURE);
    const catalog = getCatalog();
    // A fresh module registry means fresh tool objects, so compare by name.
    expect(catalog.tools.slice(0, CURATED_TOOLS.length).map((tool) => tool.name)).toEqual(CURATED_NAMES);
    expect(catalog.tools.slice(0, CURATED_TOOLS.length).every((tool) => tool.source === 'curated')).toBe(true);
    expect(catalog.tools.slice(CURATED_TOOLS.length).every((tool) => tool.source === 'graphql')).toBe(true);
    expect(catalog.tools).toHaveLength(CURATED_TOOLS.length + 13);
  });

  it('indexes every tool by name', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource(FIXTURE);
    const catalog = getCatalog();
    expect(catalog.byName.size).toBe(catalog.tools.length);
    for (const tool of catalog.tools) expect(catalog.byName.get(tool.name)).toBe(tool);
  });

  it('keeps the schema and the skipped fields for the audit and self-test tools', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource(FIXTURE);
    const catalog = getCatalog();
    expect(catalog.schema.getQueryType()?.getFields()).toHaveProperty('podsTable');
    expect(catalog.skipped.map((field) => field.field)).toEqual(['_empty', 'staffCallIceServers', '_empty', 'login', 'verifyOtp', 'resetUserPassword']);
  });

  it('builds once and serves the same catalog after that', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource(FIXTURE);
    expect(getCatalog()).toBe(getCatalog());
  });

  it('rebuilds from the new source after a re-registration', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource(FIXTURE);
    const first = getCatalog();
    registerCatalogSource({ typeDefsByModule: { podTypeDefs: 'type Query { podCount: Int }' }, resolvers: [] });
    const second = getCatalog();
    expect(second).not.toBe(first);
    expect(second.byName.has('pods_pods_table')).toBe(false);
    expect(second.byName.has('pods_pod_count')).toBe(true);
  });

  it('refuses an API field whose tool name collides with a curated tool', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource({ typeDefsByModule: { mcpTypeDefs: 'type Query { whoami: String }' }, resolvers: [] });
    expect(() => getCatalog()).toThrow('Two MCP tools are both called mcp_whoami');
  });

  it('refuses a query and a mutation that would share one tool name', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource({ typeDefsByModule: { podTypeDefs: 'type Query { ping: String } type Mutation { ping: String }' }, resolvers: [] });
    expect(() => getCatalog()).toThrow('Two MCP tools are both called pods_ping');
  });

  it('does not cache a failed build, so a corrected source still builds', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource({ typeDefsByModule: { podTypeDefs: 'type Query { ping: String } type Mutation { ping: String }' }, resolvers: [] });
    expect(() => getCatalog()).toThrow();
    registerCatalogSource({ typeDefsByModule: { podTypeDefs: 'type Query { ping: String }' }, resolvers: [] });
    expect(getCatalog().byName.has('pods_ping')).toBe(true);
  });

  it('serves a catalog of only the curated tools when the API exposes nothing', () => {
    const { getCatalog, registerCatalogSource } = freshCatalogModule();
    registerCatalogSource({ typeDefsByModule: { authTypeDefs: 'type Query { me: String }' }, resolvers: [] });
    const catalog = getCatalog();
    expect(catalog.tools.map((tool) => tool.name)).toEqual(CURATED_NAMES);
    expect(catalog.skipped).toEqual([{ field: 'me', kind: 'QUERY', module: 'authTypeDefs', reason: 'its module is not exposed to MCP' }]);
  });
});
