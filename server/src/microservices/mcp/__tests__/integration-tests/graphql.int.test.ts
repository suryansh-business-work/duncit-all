import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { resolvers, typeDefsByModule } from '@modules';
import { signToken, startTestServer, type TestServer } from '@test/harness';
import { mcpConnectionService } from '../../auth/connections.service';
import { mcpConsentService } from '../../auth/consent.service';
import { McpClientModel } from '../../auth/oauth.models';
import { registerCatalogSource } from '../../catalog/catalog';
import { MCP_ENDPOINTS } from '../../catalog/endpoints';
import { mcpSettingsService } from '../../settings/settings.service';
import { McpToolCallModel } from '../../usage/usage.model';

/**
 * The MCP console's API through the real schema (every module), over HTTP with
 * a signed session token: who may call what, and what each audience reads.
 */

jest.setTimeout(60_000);

const MCP_URL = 'http://localhost:4810';
const REDIRECT = 'http://localhost:8765/callback';
const savedMcpUrl = process.env.MCP_URL;

let server: TestServer;

beforeAll(async () => {
  process.env.MCP_URL = MCP_URL;
  // index.ts hands the catalog its source when it mounts the MCP router; the
  // console resolvers read the same catalog.
  registerCatalogSource({ typeDefsByModule, resolvers });
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
  if (savedMcpUrl === undefined) delete process.env.MCP_URL;
  else process.env.MCP_URL = savedMcpUrl;
});

beforeEach(() => {
  mcpSettingsService.clearCache();
});

afterEach(() => {
  mcpSettingsService.clearCache();
});

interface Person {
  id: string;
  email: string;
  roles: string[];
}

const person = (roles: string[], email = `gql-${new Types.ObjectId().toHexString()}@duncit.com`): Person => ({
  id: new Types.ObjectId().toHexString(),
  email,
  roles,
});

interface GqlResponse<T> {
  data?: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

async function ask<T = Record<string, unknown>>(
  who: Person | null,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GqlResponse<T>> {
  const response = await fetch(server.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(who ? { authorization: `Bearer ${signToken(who)}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as GqlResponse<T>;
}

/** The data, failing the test with the server's own message when there is none. */
async function read<T>(who: Person | null, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await ask<T>(who, query, variables);
  if (res.errors?.length || !res.data) throw new Error(`GraphQL refused: ${JSON.stringify(res.errors)}`);
  return res.data;
}

describe('who may call what', () => {
  const unknownId = new Types.ObjectId().toHexString();
  const operations: Record<string, { query: string; variables?: Record<string, unknown> }> = {
    mcpConnectors: { query: 'query { mcpConnectors { key } }' },
    mcpCatalog: { query: 'query { mcpCatalog(search: "no tool is called this") { total } }' },
    mcpUsageSummary: { query: 'query { mcpUsageSummary { scope } }' },
    mcpToolCallsTable: { query: 'query { mcpToolCallsTable { total } }' },
    mcpToolCall: { query: 'query ($id: ID!) { mcpToolCall(id: $id) { id } }', variables: { id: unknownId } },
    myMcpConnections: { query: 'query { myMcpConnections { id } }' },
    mcpConnectionsTable: { query: 'query { mcpConnectionsTable { total } }' },
    mcpSettings: { query: 'query { mcpSettings { currency } }' },
    mcpAuthorizationRequest: {
      query: 'query ($id: ID!) { mcpAuthorizationRequest(id: $id) { id } }',
      variables: { id: 'no-such-request' },
    },
    approveMcpAuthorization: {
      query: 'mutation ($id: ID!) { approveMcpAuthorization(id: $id, allow_write: true) { redirect_url } }',
      variables: { id: 'no-such-request' },
    },
    denyMcpAuthorization: {
      query: 'mutation ($id: ID!) { denyMcpAuthorization(id: $id) { redirect_url } }',
      variables: { id: 'no-such-request' },
    },
    revokeMcpConnection: {
      query: 'mutation ($id: ID!) { revokeMcpConnection(id: $id) { id } }',
      variables: { id: unknownId },
    },
    updateMcpSettings: { query: 'mutation { updateMcpSettings(input: { currency: "EUR" }) { currency } }' },
  };

  // The outcome each audience gets: OK, or the error code. Unknown ids are
  // used on purpose, so a caller who passes the gate reaches the service and
  // is told NOT_FOUND by IT — proof the gate let them through.
  const expected: Array<[string, string, string, string, string]> = [
    // operation               anonymous          finance only   MCP user      MCP manager
    ['mcpConnectors', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpCatalog', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpUsageSummary', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpToolCallsTable', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpToolCall', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['myMcpConnections', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpConnectionsTable', 'UNAUTHENTICATED', 'FORBIDDEN', 'OK', 'OK'],
    ['mcpSettings', 'UNAUTHENTICATED', 'FORBIDDEN', 'FORBIDDEN', 'OK'],
    ['updateMcpSettings', 'UNAUTHENTICATED', 'FORBIDDEN', 'FORBIDDEN', 'OK'],
    // The consent page is for anyone signed in — only approving needs an MCP role.
    ['mcpAuthorizationRequest', 'UNAUTHENTICATED', 'NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND'],
    ['approveMcpAuthorization', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'NOT_FOUND'],
    ['denyMcpAuthorization', 'UNAUTHENTICATED', 'NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND'],
    ['revokeMcpConnection', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'NOT_FOUND'],
  ];

  const audiences: Array<[string, Person | null]> = [
    ['anonymous', null],
    ['a FINANCE_MANAGER without an MCP role', person(['FINANCE_MANAGER'])],
    ['an MCP_USER', person(['MCP_USER'])],
    ['an MCP_MANAGER', person(['MCP_MANAGER'])],
  ];

  const outcomeOf = async (who: Person | null, operation: string) => {
    const { query, variables } = operations[operation];
    const res = await ask(who, query, variables);
    return res.errors?.length ? (res.errors[0].extensions?.code ?? 'ERROR') : 'OK';
  };

  it.each(expected)('%s: anonymous → %s, finance only → %s, MCP user → %s, MCP manager → %s', async (operation, ...codes) => {
    const outcomes = [];
    for (const [, who] of audiences) outcomes.push(await outcomeOf(who, operation));
    expect(outcomes).toEqual(codes);
  });

  it('a SUPER_ADMIN passes every MCP gate, settings included', async () => {
    const admin = person(['SUPER_ADMIN']);
    for (const operation of ['mcpConnectors', 'mcpSettings', 'updateMcpSettings', 'mcpUsageSummary']) {
      expect(await outcomeOf(admin, operation)).toBe('OK');
    }
  });
});

describe('mcpConnectors', () => {
  type Connector = { key: string; label: string; url: string; portal: string; categories: string[]; accessible: boolean; tool_count: number };
  const CONNECTORS = 'query { mcpConnectors { key label url portal categories accessible tool_count } }';

  it('lists the gateway first, then every console connector with its URL, marking the ones this person cannot open', async () => {
    const podsLead = person(['MCP_USER', 'ALL_PODS_ACCESS']);

    const { mcpConnectors } = await read<{ mcpConnectors: Connector[] }>(podsLead, CONNECTORS);

    expect(mcpConnectors.map((connector) => connector.key)).toEqual(['gateway', ...MCP_ENDPOINTS.map((endpoint) => endpoint.key)]);
    const byKey = Object.fromEntries(mcpConnectors.map((connector) => [connector.key, connector]));
    expect(byKey.gateway).toMatchObject({ url: `${MCP_URL}/mcp`, portal: '', accessible: true });
    expect(byKey.gateway.tool_count).toBeGreaterThan(byKey.pods.tool_count);
    expect(byKey.gateway.categories).toEqual(expect.arrayContaining(['pods', 'mcp']));
    expect(byKey.gateway.categories).not.toContain('finance');
    expect(byKey.pods).toMatchObject({ label: 'Pods console', url: `${MCP_URL}/pods/mcp`, portal: 'pods', categories: ['pods'], accessible: true });
    expect(byKey.pods.tool_count).toBeGreaterThan(0);
    expect(byKey.finance).toMatchObject({ url: `${MCP_URL}/finance/mcp`, accessible: false, tool_count: 0 });
    // The member and partner apps are open to every account.
    expect(byKey.app.accessible).toBe(true);
    expect(byKey.partners.accessible).toBe(true);
  });

  it('a connector’s tool count is exactly what the catalog lists for it', async () => {
    const podsLead = person(['MCP_USER', 'ALL_PODS_ACCESS']);

    const { mcpConnectors } = await read<{ mcpConnectors: Connector[] }>(podsLead, CONNECTORS);
    const { mcpCatalog } = await read<{ mcpCatalog: { total: number } }>(
      podsLead,
      'query { mcpCatalog(endpoint: "pods") { total } }'
    );

    expect(mcpConnectors.find((connector) => connector.key === 'pods')?.tool_count).toBe(mcpCatalog.total);
  });
});

describe('mcpCatalog', () => {
  interface ToolInfo {
    name: string;
    title: string;
    description: string;
    category: string;
    category_label: string;
    kind: string;
    risk: string;
    needs_confirmation: boolean;
    endpoints: string[];
    available: boolean;
    unavailable_reason: string | null;
    input_schema: string;
  }
  interface Catalog {
    mcpCatalog: { total: number; categories: Array<{ category: string; label: string; tools: number }>; tools: ToolInfo[] };
  }
  const CATALOG = `query ($endpoint: String, $category: String, $search: String) {
    mcpCatalog(endpoint: $endpoint, category: $category, search: $search) {
      total
      categories { category label tools }
      tools { name title description category category_label kind risk needs_confirmation endpoints available unavailable_reason input_schema }
    }
  }`;

  const podsLead = person(['MCP_USER', 'ALL_PODS_ACCESS', 'CITY_ADMIN']);

  it('filters to one connector, and every tool row carries its parameters as a JSON Schema document', async () => {
    const { mcpCatalog } = await read<Catalog>(podsLead, CATALOG, { endpoint: 'pods' });

    expect(mcpCatalog.total).toBe(mcpCatalog.tools.length);
    expect(mcpCatalog.tools.every((tool) => tool.endpoints.includes('pods') && tool.available)).toBe(true);
    const create = mcpCatalog.tools.find((tool) => tool.name === 'pods_create_pod');
    expect(create).toMatchObject({ title: 'Create pod', category: 'pods', category_label: 'Pods', kind: 'MUTATION', risk: 'WRITE', needs_confirmation: false });
    const schema = JSON.parse(create?.input_schema ?? '{}') as {
      type: string;
      additionalProperties: boolean;
      required: string[];
      properties: Record<string, { type?: string; required?: string[] }>;
    };
    expect(schema).toMatchObject({ type: 'object', additionalProperties: false });
    expect(schema.required).toEqual(expect.arrayContaining(['input', 'mcp_reason']));
    expect(schema.properties.input.type).toBe('object');
    expect(schema.properties.input.required).toEqual(
      expect.arrayContaining(['pod_title', 'pod_hosts_id', 'club_id', 'pod_description', 'pod_date_time', 'pod_type'])
    );
    expect(Object.keys(schema.properties)).toEqual(expect.arrayContaining(['mcp_reason', 'mcp_guard']));
  });

  it('marks a destructive tool as needing the person’s OK', async () => {
    const { mcpCatalog } = await read<Catalog>(podsLead, CATALOG, { endpoint: 'pods', search: 'delete pod' });

    const remove = mcpCatalog.tools.find((tool) => tool.name === 'pods_delete_pod');
    expect(remove).toMatchObject({ risk: 'DESTRUCTIVE', needs_confirmation: true });
    expect((JSON.parse(remove?.input_schema ?? '{}') as { required: string[] }).required).toEqual(
      expect.arrayContaining(['pod_doc_id', 'mcp_reason', 'mcp_confirm'])
    );
  });

  it('searches the name, title and description, case-insensitively', async () => {
    const { mcpCatalog } = await read<Catalog>(podsLead, CATALOG, { endpoint: 'pods', search: '  Create POD ' });

    expect(mcpCatalog.tools.map((tool) => tool.name)).toContain('pods_create_pod');
    for (const tool of mcpCatalog.tools) {
      expect(`${tool.name} ${tool.title} ${tool.description}`.toLowerCase()).toContain('create pod');
    }
  });

  it('filters by category across the whole catalog and says why a tool is out of reach', async () => {
    const { mcpCatalog } = await read<Catalog>(podsLead, CATALOG, { category: 'finance' });

    expect(mcpCatalog.total).toBeGreaterThan(0);
    expect(mcpCatalog.categories).toEqual([{ category: 'finance', label: 'Finance', tools: mcpCatalog.total }]);
    for (const tool of mcpCatalog.tools) {
      expect(tool).toMatchObject({
        category: 'finance',
        available: false,
        unavailable_reason: 'Your account has no console that includes this tool.',
      });
    }
  });

  it('lists nothing for a connector the person cannot open', async () => {
    const { mcpCatalog } = await read<Catalog>(podsLead, CATALOG, { endpoint: 'finance' });

    expect(mcpCatalog).toEqual({ total: 0, categories: [], tools: [] });
  });

  it('reflects a tool an MCP manager switched off: unavailable in the catalog, gone from its connector', async () => {
    const manager = person(['MCP_MANAGER']);
    await read(manager, 'mutation { updateMcpSettings(input: { disabled_tools: ["pods_create_pod"] }) { disabled_tools } }');

    const everywhere = await read<Catalog>(podsLead, CATALOG, { category: 'pods', search: 'create pod' });
    const onPods = await read<Catalog>(podsLead, CATALOG, { endpoint: 'pods', search: 'create pod' });

    expect(everywhere.mcpCatalog.tools.find((tool) => tool.name === 'pods_create_pod')).toMatchObject({
      available: false,
      unavailable_reason: 'An MCP manager has switched this tool off.',
    });
    expect(onPods.mcpCatalog.tools.map((tool) => tool.name)).not.toContain('pods_create_pod');
  });
});

describe('mcpSettings', () => {
  it('an MCP manager reads and saves the settings, and the save names them', async () => {
    const manager = person(['MCP_MANAGER']);

    const before = await read<{ mcpSettings: { currency: string; default_injection_guard: string; updated_by: string | null } }>(
      manager,
      'query { mcpSettings { currency default_injection_guard updated_by } }'
    );
    const saved = await read<{ updateMcpSettings: { currency: string; token_price_input_per_million: number; updated_by: string } }>(
      manager,
      'mutation { updateMcpSettings(input: { currency: "EUR", token_price_input_per_million: 2.5 }) { currency token_price_input_per_million updated_by } }'
    );

    expect(before.mcpSettings).toEqual({ currency: 'USD', default_injection_guard: 'block', updated_by: null });
    expect(saved.updateMcpSettings).toEqual({ currency: 'EUR', token_price_input_per_million: 2.5, updated_by: manager.id });
  });

  it('refuses an invalid value with BAD_USER_INPUT', async () => {
    const res = await ask(person(['MCP_MANAGER']), 'mutation { updateMcpSettings(input: { trusted_redirect_hosts: [] }) { currency } }');

    expect(res.errors?.[0]).toMatchObject({
      message: 'Keep at least one trusted host',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('activity and connections', () => {
  const seedCall = (who: Person) =>
    McpToolCallModel.create({
      user_id: new Types.ObjectId(who.id),
      user_email: who.email,
      client_name: 'Claude',
      endpoint: 'pods',
      tool: 'pods_pods_table',
      category: 'pods',
      kind: 'QUERY',
      risk: 'READ',
      status: 'OK',
      duration_ms: 40,
    });

  it('a member sees their own activity; an MCP manager sees everyone’s', async () => {
    const asha = person(['MCP_USER']);
    const vikram = person(['MCP_USER']);
    await seedCall(asha);
    await seedCall(vikram);
    const SUMMARY = 'query ($user: ID) { mcpUsageSummary(user_id: $user) { scope totals { calls users } } }';

    const mine = await read<{ mcpUsageSummary: { scope: string; totals: { calls: number } } }>(asha, SUMMARY);
    const all = await read<{ mcpUsageSummary: { scope: string; totals: { calls: number; users: number } } }>(person(['MCP_MANAGER']), SUMMARY);
    const prying = await ask(asha, SUMMARY, { user: vikram.id });

    expect(mine.mcpUsageSummary).toEqual({ scope: 'MINE', totals: { calls: 1, users: 1 } });
    expect(all.mcpUsageSummary).toEqual({ scope: 'ALL', totals: { calls: 2, users: 2 } });
    expect(prying.errors?.[0].extensions?.code).toBe('FORBIDDEN');
  });

  it('a member lists and revokes their own connection, and cannot touch anyone else’s', async () => {
    const owner = person(['MCP_USER']);
    const stranger = person(['MCP_USER']);
    const { id } = await mcpConnectionService.create({
      user: owner,
      clientId: 'client-claude',
      clientName: 'Claude',
      scopes: ['mcp:read'],
      resource: `${MCP_URL}/pods/mcp`,
    });
    const REVOKE = 'mutation ($id: ID!) { revokeMcpConnection(id: $id) { id status revoked_reason } }';

    const listed = await read<{ myMcpConnections: Array<{ id: string; status: string }> }>(owner, 'query { myMcpConnections { id status } }');
    const strangersList = await read<{ myMcpConnections: unknown[] }>(stranger, 'query { myMcpConnections { id } }');
    const refused = await ask(stranger, REVOKE, { id });
    const revoked = await read<{ revokeMcpConnection: { id: string; status: string; revoked_reason: string } }>(owner, REVOKE, { id });

    expect(listed.myMcpConnections).toEqual([{ id, status: 'ACTIVE' }]);
    expect(strangersList.myMcpConnections).toEqual([]);
    expect(refused.errors?.[0].extensions?.code).toBe('NOT_FOUND');
    expect(revoked.revokeMcpConnection).toEqual({ id, status: 'REVOKED', revoked_reason: 'revoked by its owner' });
  });
});

describe('the consent page over GraphQL', () => {
  async function pendingRequest(): Promise<string> {
    const clientId = randomUUID();
    await McpClientModel.create({ client_id: clientId, client_name: 'Claude', redirect_uris: [REDIRECT], client_id_issued_at: 1_790_000_000 });
    return mcpConsentService.open({
      clientId,
      redirectUri: REDIRECT,
      codeChallenge: 'challenge',
      state: 'st',
      scopes: ['mcp:read', 'mcp:write'],
      resource: `${MCP_URL}/pods/mcp`,
    });
  }
  const DESCRIBE = 'query ($id: ID!) { mcpAuthorizationRequest(id: $id) { client_name redirect_host trusted requests_write endpoint_label can_approve } }';
  const APPROVE = 'mutation ($id: ID!, $w: Boolean!) { approveMcpAuthorization(id: $id, allow_write: $w) { redirect_url } }';

  it('anyone signed in sees the request, labelled with the connector it is for; only an MCP account may approve', async () => {
    const requestId = await pendingRequest();
    const financeOnly = person(['FINANCE_MANAGER']);

    const view = await read<{ mcpAuthorizationRequest: Record<string, unknown> }>(financeOnly, DESCRIBE, { id: requestId });
    const refused = await ask(financeOnly, APPROVE, { id: requestId, w: true });
    const approved = await read<{ approveMcpAuthorization: { redirect_url: string } }>(person(['MCP_USER']), APPROVE, { id: requestId, w: false });

    expect(view.mcpAuthorizationRequest).toEqual({
      client_name: 'Claude',
      redirect_host: 'localhost',
      trusted: true,
      requests_write: true,
      endpoint_label: 'Pods console',
      can_approve: false,
    });
    expect(refused.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    const back = new URL(approved.approveMcpAuthorization.redirect_url);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT);
    expect(back.searchParams.get('state')).toBe('st');
    expect(back.searchParams.get('code')).toEqual(expect.any(String));
    // RFC 9207: the issuer exactly as the authorization-server metadata names it.
    expect(back.searchParams.get('iss')).toBe(new URL(MCP_URL).href);
  });

  it('declining sends the browser back with access_denied', async () => {
    const requestId = await pendingRequest();

    const { denyMcpAuthorization } = await read<{ denyMcpAuthorization: { redirect_url: string } }>(
      person(['FINANCE_MANAGER']),
      'mutation ($id: ID!) { denyMcpAuthorization(id: $id) { redirect_url } }',
      { id: requestId }
    );

    const back = new URL(denyMcpAuthorization.redirect_url);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('iss')).toBe(new URL(MCP_URL).href);
  });
});
