jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('../../auth/connections.service', () => ({
  ConnectionRefusedError: class ConnectionRefusedError extends Error {},
  mcpConnectionService: { verify: jest.fn(), rotate: jest.fn(), revokeByToken: jest.fn() },
}));
jest.mock('../../auth/consent.service', () => ({
  ConsentGrantError: class ConsentGrantError extends Error {},
  mcpConsentService: { open: jest.fn(), challengeFor: jest.fn(), consume: jest.fn() },
}));
jest.mock('../../settings/settings.service', () => ({ mcpSettingsService: { get: jest.fn() } }));
jest.mock('../../usage/usage.recorder', () => ({ recordToolCall: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));

import express, { type Express } from 'express';
import request from 'supertest';
import type { ApolloServer } from '@apollo/server';
import { getUrlConfigs } from '@config/url-configs';
import type { AuthUser, GraphQLContext } from '@context';
import { logs } from '@observability/log';
import type { VerifiedConnection } from '../../auth/connections.service';
import { mcpConnectionService } from '../../auth/connections.service';
import { buildMcpRouter, MCP_PATH, tokenFits } from '../../http/mcp.router';
import { mcpSettingsService } from '../../settings/settings.service';
import { recordToolCall } from '../../usage/usage.recorder';
import { FINANCE_STAFF, FIXTURE_RESOLVERS, FIXTURE_TYPE_DEFS, MEMBER, PODS_STAFF, settings } from './fixtures';

const urlConfigs = getUrlConfigs as jest.Mock;
const verify = mcpConnectionService.verify as jest.Mock;
const record = recordToolCall as jest.Mock;
const logError = logs.server.error as jest.Mock;

const MCP_URL = 'http://127.0.0.1';
const ACCEPT = 'application/json, text/event-stream';

function connection(resource: string, user: AuthUser = PODS_STAFF, scopes = ['mcp:read', 'mcp:write']): VerifiedConnection {
  return { id: '64b7f0c2a1e4c9d3f0a1b2d4', clientId: 'client-1', clientName: 'Claude', scopes, resource, expiresAt: 4_102_444_800, user };
}

function app(): Express {
  const server = express();
  server.use(
    buildMcpRouter({ apollo: {} as ApolloServer<GraphQLContext>, typeDefsByModule: FIXTURE_TYPE_DEFS, resolvers: FIXTURE_RESOLVERS })
  );
  server.use((_req, res) => {
    res.status(200).send('console SPA');
  });
  return server;
}

/** The JSON-RPC message in a reply: one SSE event for a 2025-era request, or plain JSON. */
function rpcMessage(text: string): { result?: Record<string, unknown>; error?: { code: number; message: string } } {
  const data = text.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(data ? data.slice('data: '.length) : text);
}

const rpcCall = (path: string, method: string, params: Record<string, unknown> = {}) =>
  request(app()).post(path).set('Authorization', 'Bearer dmcp_at_good').set('Accept', ACCEPT).send({ jsonrpc: '2.0', id: 1, method, params });

beforeEach(() => {
  urlConfigs.mockReset().mockResolvedValue({ mcpUrl: MCP_URL, mcpPortalUrl: MCP_URL });
  verify.mockReset();
  (mcpSettingsService.get as jest.Mock).mockReset().mockResolvedValue(settings());
  record.mockClear();
});

describe('MCP_PATH', () => {
  it.each([
    '/mcp',
    '/mcp/',
    '/pods/mcp',
    '/regional-club-admin/mcp',
    '/authorize',
    '/token',
    '/register',
    '/revoke',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-protected-resource/finance/mcp',
  ])('sends %s to the MCP router', (path) => {
    expect(MCP_PATH.test(path)).toBe(true);
  });

  it.each(['/', '/graphql', '/pods', '/pods/mcp/extra', '/a/b/mcp', '/MCP', '/tokens', '/table-api/podsTable', '/connect', '/.well-known/openid-configuration'])(
    'leaves %s to the rest of the app',
    (path) => {
      expect(MCP_PATH.test(path)).toBe(false);
    }
  );
});

describe('tokenFits', () => {
  const gateway = `${MCP_URL}/mcp`;

  it('lets a gateway token open every connector', () => {
    expect(tokenFits(gateway, `${MCP_URL}/pods/mcp`, gateway)).toBe(true);
    expect(tokenFits(`${gateway}/`, `${MCP_URL}/finance/mcp`, gateway)).toBe(true);
  });

  it('lets a connector token open only its own connector, trailing slash or not', () => {
    expect(tokenFits(`${MCP_URL}/pods/mcp/`, `${MCP_URL}/pods/mcp`, gateway)).toBe(true);
    expect(tokenFits(`${MCP_URL}/pods/mcp`, `${MCP_URL}/finance/mcp`, gateway)).toBe(false);
  });

  it('does not let a token for another host in', () => {
    expect(tokenFits('https://evil.example/mcp', `${MCP_URL}/pods/mcp`, gateway)).toBe(false);
  });
});

describe('buildMcpRouter — routing', () => {
  it('passes every non-MCP request straight through without building anything', async () => {
    const res = await request(app()).get('/graphql');
    expect(res.text).toBe('console SPA');
    expect(urlConfigs).not.toHaveBeenCalled();
  });

  it('refuses an MCP request addressed to a foreign host', async () => {
    const res = await request(app()).post('/pods/mcp').set('Host', 'server.duncit.com').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Invalid Host: server.duncit.com');
  });

  it('builds the routes once and reuses them', async () => {
    const server = app();
    await request(server).get('/.well-known/oauth-authorization-server');
    await request(server).get('/.well-known/oauth-protected-resource/pods/mcp');
    expect(urlConfigs).toHaveBeenCalledTimes(1);
  });

  it('reports a failed build as an error and tries again on the next request', async () => {
    urlConfigs.mockRejectedValueOnce(new Error('config store down'));
    const server = app();
    const failed = await request(server).get('/.well-known/oauth-authorization-server');
    expect(failed.status).toBe(500);
    expect(logError).toHaveBeenCalledWith('mcp', 'router', { error: expect.objectContaining({ message: 'config store down' }) });
    const retried = await request(server).get('/.well-known/oauth-authorization-server');
    expect(retried.status).toBe(200);
    expect(urlConfigs).toHaveBeenCalledTimes(2);
  });
});

describe('buildMcpRouter — OAuth discovery', () => {
  it('publishes the authorization server metadata with the configured issuer', async () => {
    const res = await request(app()).get('/.well-known/oauth-authorization-server');
    expect(res.body).toMatchObject({ issuer: `${MCP_URL}/`, authorization_endpoint: `${MCP_URL}/authorize`, token_endpoint: `${MCP_URL}/token` });
  });

  it('describes each connector as its own protected resource', async () => {
    const res = await request(app()).get('/.well-known/oauth-protected-resource/pods/mcp');
    expect(res.body).toEqual({
      resource: `${MCP_URL}/pods/mcp`,
      authorization_servers: [`${MCP_URL}/`],
      scopes_supported: ['mcp:read', 'mcp:write'],
      resource_name: 'Duncit MCP — Pods console',
    });
  });

  it('describes the gateway as the default protected resource', async () => {
    const res = await request(app()).get('/.well-known/oauth-protected-resource/mcp');
    expect(res.body).toMatchObject({ resource: `${MCP_URL}/mcp`, resource_name: 'Duncit MCP — gateway', scopes_supported: ['mcp:read', 'mcp:write'] });
  });
});

describe('buildMcpRouter — the bearer check', () => {
  it('asks for a token, pointing at where to get one', async () => {
    const res = await request(app()).post('/pods/mcp').set('Accept', ACCEPT).send({});
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain(`resource_metadata="${MCP_URL}/.well-known/oauth-protected-resource/pods/mcp"`);
    expect(res.body.error).toBe('invalid_token');
  });

  it('answers an unknown or expired token with 401, not a server error', async () => {
    verify.mockResolvedValue(null);
    const res = await rpcCall('/pods/mcp', 'tools/list');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid_token', error_description: 'Invalid or expired access token' });
  });

  it('answers 500 when the token store itself fails', async () => {
    verify.mockRejectedValue(new Error('mongo down'));
    expect((await rpcCall('/pods/mcp', 'tools/list')).status).toBe(500);
  });

  it('refuses a token issued for another connector', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/finance/mcp`, FINANCE_STAFF));
    const res = await rpcCall('/pods/mcp', 'tools/list');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid_token', error_description: 'This token was issued for another connector. Connect this URL separately.' });
  });

  it('refuses a connector whose console the person cannot open', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/finance/mcp`, MEMBER));
    const res = await rpcCall('/finance/mcp', 'tools/list');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'insufficient_scope', error_description: 'Your account has no access to this console.' });
  });
});

describe('buildMcpRouter — serving a connector', () => {
  it('serves a connector to its own token, listing that person’s tools', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/pods/mcp`));
    const res = await rpcCall('/pods/mcp', 'tools/list');
    expect(res.status).toBe(200);
    const names = (rpcMessage(res.text).result?.tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(names).toContain('pods_create_pod');
    expect(names).not.toContain('finance_payout_summary');
  });

  it('lets a gateway token open a console connector too', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/mcp`));
    expect((await rpcCall('/pods/mcp', 'tools/list')).status).toBe(200);
  });

  it('serves the gateway its curated tools', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/mcp`, MEMBER));
    const res = await rpcCall('/mcp', 'tools/list');
    const names = (rpcMessage(res.text).result?.tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(names).toContain('mcp_call_tool');
    expect(names).not.toContain('pods_pods_table');
  });

  it('runs a call as the token’s person, on that connection, from that address', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/pods/mcp`, PODS_STAFF, ['mcp:read']));
    const res = await rpcCall('/pods/mcp', 'tools/call', { name: 'mcp_whoami', arguments: {} }).set('User-Agent', 'Claude-User/1.0');
    const content = rpcMessage(res.text).result?.content as Array<{ text: string }>;
    const whoami = JSON.parse(content[0].text).data;
    expect(whoami.user.id).toBe(PODS_STAFF.id);
    expect(whoami.connection).toMatchObject({ app: 'Claude', scopes: ['mcp:read'], can_write: false });
    expect(whoami.this_connector).toEqual({ key: 'pods', label: 'Pods console', url: `${MCP_URL}/pods/mcp` });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'mcp_whoami', endpoint: 'pods', connectionId: '64b7f0c2a1e4c9d3f0a1b2d4', clientName: 'Claude', userAgent: 'Claude-User/1.0' })
    );
    expect(record.mock.calls[0][0].ip).toEqual(expect.any(String));
  });

  it('reads the MCP settings for every call, so a kill switch applies at once', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/pods/mcp`));
    (mcpSettingsService.get as jest.Mock).mockResolvedValue(settings({ write_tools_enabled: false }));
    const res = await rpcCall('/pods/mcp', 'tools/list');
    const names = (rpcMessage(res.text).result?.tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(names).not.toContain('pods_create_pod');
    expect(mcpSettingsService.get).toHaveBeenCalledTimes(1);
  });

  it('answers GET on a connector with 405: the server is stateless', async () => {
    verify.mockResolvedValue(connection(`${MCP_URL}/pods/mcp`));
    const res = await request(app()).get('/pods/mcp').set('Authorization', 'Bearer dmcp_at_good').set('Accept', 'text/event-stream');
    expect(res.status).toBe(405);
  });
});
