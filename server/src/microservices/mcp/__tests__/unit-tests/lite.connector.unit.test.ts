import jwt from 'jsonwebtoken';
import { parse, print } from 'graphql';
import { LITE_ASSERTION_HEADER, liteSecret, signCallAssertion, signSchemaAssertion } from '../../lite/lite.assertion';
import { fetchLiteSdl, runLiteOperation, trimSlashes } from '../../lite/lite.client';
import { liteCatalogState, refreshLiteTools, resetLiteCatalog } from '../../lite/lite.catalog';
import { buildLiteTools, liteToolName } from '../../lite/lite.tools';
import { META_REASON } from '../../mcp.constants';
import { READ_ONLY, READ_WRITE, toolContext, user } from './fixtures';

jest.mock('@config/url-configs', () => ({ getUrlConfigs: async () => ({ liteUrl: 'https://lite.test//' }) }));

const SECRET = 'lite-shared-secret-for-tests';
const verify = (token: string) => jwt.verify(token, SECRET, { issuer: 'mcp.duncit.com', audience: 'lite.duncit.com' }) as jwt.JwtPayload;

const SDL = `
  type LiteEvent { id: ID! title: String! capacity: Int registrations: [LiteRegistration!]! }
  type LiteRegistration { id: ID! code: String! qr_data_url: String }
  type Query {
    _lite: Boolean
    "Every event the person hosts."
    liteMyEvents(past: Boolean): [LiteEvent!]!
    liteEvent(slug: String!): LiteEvent
    liteEnvEntries: [String!]!
    publicLocales: [String!]!
    liteUploadTicket: String
  }
  type Mutation {
    liteCreateEvent(title: String!, capacity: Int): LiteEvent!
    liteCancelEvent(id: ID!, reason: String): LiteEvent!
    liteRequestSignInCode(email: String!): Boolean!
    liteVerifyContact(kind: String!, value: String!, code: String!): Boolean!
    liteCreateEnvEntry(name: String!): Boolean!
    liteTrackEventView(slug: String!): Boolean!
  }
`;

const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let fetchMock: jest.SpyInstance;

beforeEach(() => {
  process.env.LITE_MCP_SECRET = SECRET;
  fetchMock = jest.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  fetchMock.mockRestore();
  delete process.env.LITE_MCP_SECRET;
  resetLiteCatalog();
});

describe('lite assertion', () => {
  it('reads the shared secret trimmed, and reports none when it is blank', async () => {
    process.env.LITE_MCP_SECRET = `  ${SECRET} `;
    expect(await liteSecret()).toBe(SECRET);
    process.env.LITE_MCP_SECRET = '   ';
    expect(await liteSecret()).toBeNull();
  });

  it('signs a call assertion Lite can verify, naming the person and the scope', () => {
    const claims = verify(signCallAssertion(SECRET, { email: 'asha@duncit.com', duncitUserId: 'u1', scope: 'write' }));
    expect(claims).toMatchObject({ purpose: 'call', email: 'asha@duncit.com', duncit_user_id: 'u1', scope: 'write' });
  });

  it('lives one minute at most, so a captured header is useless soon after', () => {
    const claims = verify(signCallAssertion(SECRET, { email: 'a@b.co', duncitUserId: 'u1', scope: 'read' }));
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(60);
  });

  it('cannot be verified with another secret', () => {
    const token = signCallAssertion(SECRET, { email: 'a@b.co', duncitUserId: 'u1', scope: 'read' });
    expect(() => jwt.verify(token, 'another-secret')).toThrow();
  });

  it('signs a schema assertion that names no person and only reads', () => {
    const claims = verify(signSchemaAssertion(SECRET));
    expect(claims).toMatchObject({ purpose: 'schema', scope: 'read' });
    expect(claims.email).toBeUndefined();
  });
});

describe('lite client', () => {
  it('drops every trailing slash and nothing else', () => {
    expect(trimSlashes('https://lite.test//')).toBe('https://lite.test');
    expect(trimSlashes('https://lite.test/a')).toBe('https://lite.test/a');
    expect(trimSlashes('')).toBe('');
  });

  it('refuses to fetch the schema while the connector has no secret', async () => {
    delete process.env.LITE_MCP_SECRET;
    await expect(fetchLiteSdl()).rejects.toMatchObject({ extensions: { code: 'LITE_NOT_CONFIGURED' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the SDL from /mcp/schema with a schema assertion', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sdl: SDL }));
    await expect(fetchLiteSdl()).resolves.toBe(SDL);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://lite.test/mcp/schema');
    expect(verify(init.headers[LITE_ASSERTION_HEADER]).purpose).toBe('schema');
  });

  it('reports a refused schema read with the HTTP status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'A valid MCP schema assertion is required' }));
    await expect(fetchLiteSdl()).rejects.toThrow('HTTP 401');
  });

  it('posts the operation as the person and returns the data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { liteMyEvents: [] } }));
    const document = parse('query Q { liteMyEvents { id } }');
    await expect(runLiteOperation(document, 'Q', { past: true }, { email: 'asha@duncit.com', duncitUserId: 'u1', scope: 'read' })).resolves.toEqual({ liteMyEvents: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://lite.test/graphql');
    expect(JSON.parse(init.body)).toEqual({ query: print(document), operationName: 'Q', variables: { past: true } });
    expect(verify(init.headers[LITE_ASSERTION_HEADER])).toMatchObject({ email: 'asha@duncit.com', scope: 'read' });
  });

  it('surfaces Lite’s own error message and code word for word', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: null, errors: [{ message: 'Capacity cannot be negative', extensions: { code: 'BAD_USER_INPUT' } }] }));
    await expect(runLiteOperation(parse('mutation M { x }'), 'M', {}, { email: 'a@b.co', duncitUserId: 'u1', scope: 'write' })).rejects.toMatchObject({
      message: 'Capacity cannot be negative',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('reports an answer with neither data nor errors as unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, {}));
    await expect(runLiteOperation(parse('query Q { x }'), 'Q', {}, { email: 'a@b.co', duncitUserId: 'u1', scope: 'read' })).rejects.toMatchObject({
      extensions: { code: 'LITE_UNAVAILABLE' },
    });
  });
});

describe('lite tools', () => {
  const built = buildLiteTools(SDL);
  const byName = new Map(built.tools.map((tool) => [tool.name, tool]));

  it('names each tool lite_<field> without repeating the field’s own lite prefix', () => {
    expect(liteToolName('liteCreateEvent')).toBe('lite_create_event');
    expect([...byName.keys()].sort()).toEqual(['lite_cancel_event', 'lite_create_event', 'lite_event', 'lite_my_events']);
  });

  it('keeps sign-in, contact proofs, credentials, uploads, page views and plumbing out, each with a reason', () => {
    const skipped = new Map(built.skipped.map((s) => [s.field, s.reason]));
    for (const field of ['liteRequestSignInCode', 'liteVerifyContact', 'liteEnvEntries', 'liteCreateEnvEntry', 'liteUploadTicket', 'liteTrackEventView', '_lite', 'publicLocales']) {
      expect(skipped.get(field)).toEqual(expect.any(String));
    }
    expect(built.skipped.every((s) => s.module === 'duncit-lite')).toBe(true);
  });

  it('lists the tools on the lite connector only, under the Duncit Lite category', () => {
    for (const tool of built.tools) {
      expect(tool.listedOn).toEqual(['lite']);
      expect(tool.category).toBe('lite');
    }
  });

  it('marks reads as read-only, writes as writes, and asks for a yes before cancelling', () => {
    expect(byName.get('lite_my_events')?.risk).toBe('READ');
    expect(byName.get('lite_create_event')?.risk).toBe('WRITE');
    expect(byName.get('lite_cancel_event')?.confirm).toBe(true);
    expect(byName.get('lite_create_event')?.inputSchema.required).toEqual(expect.arrayContaining(['title', META_REASON]));
  });

  it('carries the field’s own description', () => {
    expect(byName.get('lite_my_events')?.description).toContain('Every event the person hosts.');
  });

  it('runs as the person’s email with their connection’s scope, forwarding only declared arguments', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { liteCreateEvent: { id: 'e1', title: 'Run club' } } }));
    const tool = byName.get('lite_create_event');
    const context = toolContext({ user: user(['MCP_USER'], { email: 'asha@duncit.com' }), scopes: READ_WRITE });
    await expect(tool?.run(context, { title: 'Run club', stray: 'x' })).resolves.toEqual({ id: 'e1', title: 'Run club' });
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body).variables).toEqual({ title: 'Run club' });
    expect(verify(init.headers[LITE_ASSERTION_HEADER])).toMatchObject({ email: 'asha@duncit.com', scope: 'write' });
  });

  it('asks Lite for a read-only scope on a read-only connection', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { liteMyEvents: [] } }));
    await byName.get('lite_my_events')?.run(toolContext({ scopes: READ_ONLY }), {});
    expect(verify(fetchMock.mock.calls[0][1].headers[LITE_ASSERTION_HEADER]).scope).toBe('read');
  });

  it('never selects the drawn QR, which is for a screen', () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { liteEvent: null } }));
    return byName.get('lite_event')?.run(toolContext({}), { slug: 'x' }).then(() => {
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).query).not.toContain('qr_data_url');
    });
  });

  it('refuses a Duncit account with no email, since Lite links accounts by email', async () => {
    await expect(byName.get('lite_my_events')?.run(toolContext({ user: user(['MCP_USER'], { email: null }) }), {})).rejects.toThrow('has none');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('lite catalog', () => {
  it('builds the tools from Lite’s schema and tells the catalog once', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sdl: SDL }));
    const onChange = jest.fn();
    await refreshLiteTools(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(liteCatalogState().tools.map((t) => t.name)).toContain('lite_create_event');
    expect(liteCatalogState().version).toHaveLength(64);
  });

  it('does not rebuild the catalog when Lite’s schema has not changed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sdl: SDL }));
    const onChange = jest.fn();
    await refreshLiteTools(onChange);
    fetchMock.mockResolvedValue(jsonResponse(200, { sdl: SDL }));
    await refreshLiteTools(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the last good tools when Lite is down, and records why', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sdl: SDL }));
    await refreshLiteTools(jest.fn());
    fetchMock.mockResolvedValue(jsonResponse(503, {}));
    await refreshLiteTools(jest.fn());
    expect(liteCatalogState().tools.length).toBeGreaterThan(0);
    expect(liteCatalogState().error).toContain('HTTP 503');
  });

  it('stays empty and says so while the connector is not configured', async () => {
    delete process.env.LITE_MCP_SECRET;
    await refreshLiteTools(jest.fn());
    expect(liteCatalogState().tools).toEqual([]);
    expect(liteCatalogState().error).toContain('LITE_MCP_SECRET');
  });
});
