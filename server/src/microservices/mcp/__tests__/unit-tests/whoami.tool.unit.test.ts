import { listTools } from '../../catalog/visibility';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { whoamiTool } from '../../tools/meta/whoami.tool';
import { FINANCE_STAFF, MEMBER, PODS_STAFF, PUBLIC_URL, READ_ONLY, settings, toolContext, user } from './fixtures';

type Whoami = {
  user: { id: string; email: string | null; roles: string[] };
  connection: { app: string; scopes: string[]; can_write: boolean; writes_note: string };
  this_connector: { key: string; label: string; url: string };
  gateway_url: string;
  connectors: Array<{ key: string; label: string; url: string; tools: number }>;
};

const whoami = async (options: Parameters<typeof toolContext>[0] = {}) =>
  (await whoamiTool.run(toolContext(options), {})) as Whoami;

describe('mcp_whoami', () => {
  it('is listed on every connector and reads only', () => {
    expect(whoamiTool).toMatchObject({ name: 'mcp_whoami', listedOn: ['*'], risk: 'READ', confirm: false, category: 'mcp' });
  });

  it('says who the connection acts as', async () => {
    expect((await whoami({ user: PODS_STAFF })).user).toEqual({ id: PODS_STAFF.id, email: 'asha@duncit.com', roles: ['MCP_USER', 'ALL_PODS_ACCESS'] });
  });

  it('reports a missing email as null rather than leaving it out', async () => {
    expect((await whoami({ user: user(['MCP_USER'], { email: undefined }) })).user.email).toBeNull();
  });

  it('names the AI app and the scopes of this connection', async () => {
    expect((await whoami()).connection).toMatchObject({ app: 'Claude', scopes: ['mcp:read', 'mcp:write'] });
  });

  it('can write on a read & write connection while writes are enabled', async () => {
    const { connection } = await whoami();
    expect(connection.can_write).toBe(true);
    expect(connection.writes_note).toMatch(/needs mcp_reason/);
  });

  it('cannot write on a read-only connection, and says how to fix it', async () => {
    const { connection } = await whoami({ scopes: READ_ONLY });
    expect(connection.can_write).toBe(false);
    expect(connection.writes_note).toMatch(/^This connection can only read/);
  });

  it('cannot write while an MCP manager has switched writes off, whatever the connection allows', async () => {
    expect((await whoami({ settings: settings({ write_tools_enabled: false }) })).connection.can_write).toBe(false);
  });

  it('describes the connector it was called on', async () => {
    expect((await whoami({ endpoint: 'pods' })).this_connector).toEqual({ key: 'pods', label: 'Pods console', url: `${PUBLIC_URL}/pods/mcp` });
  });

  it('describes the gateway when called there', async () => {
    expect((await whoami({ endpoint: GATEWAY_ENDPOINT })).this_connector).toEqual({
      key: GATEWAY_ENDPOINT,
      label: 'Gateway (all your consoles)',
      url: `${PUBLIC_URL}/mcp`,
    });
  });

  it('always gives the gateway URL, without a doubled slash', async () => {
    expect((await whoami({ publicUrl: `${PUBLIC_URL}/` })).gateway_url).toBe(`${PUBLIC_URL}/mcp`);
  });

  it('lists only the connectors this account can open', async () => {
    expect((await whoami({ user: MEMBER })).connectors.map((c) => c.key)).toEqual(['app', 'partners', 'mcp', 'lite']);
    expect((await whoami({ user: FINANCE_STAFF })).connectors.map((c) => c.key)).toEqual(['app', 'partners', 'finance', 'mcp', 'lite']);
  });

  it('counts the tools each connector would list for this person', async () => {
    const context = toolContext({ user: PODS_STAFF });
    const result = (await whoamiTool.run(context, {})) as Whoami;
    for (const connector of result.connectors) {
      expect(connector.tools).toBe(listTools(context.catalog, connector.key, { user: PODS_STAFF, scopes: context.scopes, settings: context.settings }).length);
      expect(connector.url).toBe(`${PUBLIC_URL}/${connector.key}/mcp`);
    }
    expect(result.connectors.find((c) => c.key === 'pods')?.tools).toBe(15);
  });

  it('takes no arguments', async () => {
    await expect(whoamiTool.run(toolContext(), { verbose: true })).rejects.toBeInstanceOf(ToolInputError);
  });
});
