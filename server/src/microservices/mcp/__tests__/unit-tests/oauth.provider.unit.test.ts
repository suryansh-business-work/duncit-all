jest.mock('../../auth/connections.service', () => ({
  ConnectionRefusedError: class ConnectionRefusedError extends Error {},
  mcpConnectionService: { verify: jest.fn(), rotate: jest.fn(), revokeByToken: jest.fn() },
}));
jest.mock('../../auth/consent.service', () => ({
  ConsentGrantError: class ConsentGrantError extends Error {},
  mcpConsentService: { open: jest.fn(), challengeFor: jest.fn(), consume: jest.fn() },
}));
jest.mock('../../auth/oauth.models', () => ({ McpClientModel: { findOne: jest.fn(), create: jest.fn() } }));
jest.mock('../../settings/settings.service', () => ({ mcpSettingsService: { get: jest.fn() } }));

import type { Response } from 'express';
import { OAuthError } from '@modelcontextprotocol/server';
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  type OAuthServerProvider,
} from '@modelcontextprotocol/server-legacy/auth';
import { ConnectionRefusedError, mcpConnectionService, type VerifiedConnection } from '../../auth/connections.service';
import { ConsentGrantError, mcpConsentService } from '../../auth/consent.service';
import { McpClientModel } from '../../auth/oauth.models';
import { clientsStore, createOAuthProvider, resolveResource, tokenVerifier } from '../../auth/oauth.provider';
import { mcpSettingsService } from '../../settings/settings.service';
import { PODS_STAFF, settings } from './fixtures';

const verify = mcpConnectionService.verify as jest.Mock;
const open = mcpConsentService.open as jest.Mock;
const challengeFor = mcpConsentService.challengeFor as jest.Mock;
const consume = mcpConsentService.consume as jest.Mock;
const rotate = mcpConnectionService.rotate as jest.Mock;
const findOne = McpClientModel.findOne as jest.Mock;
const create = McpClientModel.create as jest.Mock;

const BASE = 'https://mcp.duncit.test';
const RESOURCES = [`${BASE}/mcp`, `${BASE}/pods/mcp`];
const provider: OAuthServerProvider = createOAuthProvider({ portalUrl: BASE, resources: RESOURCES });
const CLIENT = { client_id: 'client-1', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] };
const PAIR = { accessToken: 'dmcp_at_a', refreshToken: 'dmcp_rt_r', stored: {} };
type Registration = Parameters<NonNullable<typeof clientsStore.registerClient>>[0];
const registration = (over: Record<string, unknown> = {}) => ({ ...CLIENT, ...over }) as Registration;

const verified: VerifiedConnection = {
  id: 'conn-1',
  clientId: 'client-1',
  clientName: 'Claude',
  scopes: ['mcp:read'],
  resource: `${BASE}/pods/mcp`,
  expiresAt: 4_102_444_800,
  user: PODS_STAFF,
};

const clientDoc = (over: Record<string, unknown> = {}) => ({
  client_id: 'client-1',
  client_name: 'Claude',
  client_uri: null,
  logo_uri: null,
  redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: null,
  software_id: null,
  software_version: null,
  client_id_issued_at: 1_790_000_000,
  ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  (mcpSettingsService.get as jest.Mock).mockResolvedValue(settings({ trusted_redirect_hosts: ['claude.ai', 'localhost'] }));
});

describe('tokenVerifier (the MCP endpoints’ bearer check)', () => {
  it('turns a verified connection into the SDK’s AuthInfo, carrying the connection', async () => {
    verify.mockResolvedValue(verified);
    await expect(tokenVerifier.verifyAccessToken('dmcp_at_a')).resolves.toEqual({
      token: 'dmcp_at_a',
      clientId: 'client-1',
      scopes: ['mcp:read'],
      expiresAt: 4_102_444_800,
      resource: new URL(`${BASE}/pods/mcp`),
      extra: { connection: verified },
    });
  });

  it('refuses an unknown token with the v2 OAuthError, so the endpoint answers 401 and not 500', async () => {
    verify.mockResolvedValue(null);
    const error = await tokenVerifier.verifyAccessToken('dmcp_at_x').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error).toMatchObject({ code: 'invalid_token', message: 'Invalid or expired access token' });
  });

  it('passes on a failure of the token store itself', async () => {
    verify.mockRejectedValue(new Error('mongo down'));
    await expect(tokenVerifier.verifyAccessToken('dmcp_at_a')).rejects.toThrow('mongo down');
  });
});

describe('provider.verifyAccessToken (the legacy router’s check)', () => {
  it('refuses an unknown token with the legacy InvalidTokenError', async () => {
    verify.mockResolvedValue(null);
    await expect(provider.verifyAccessToken('dmcp_at_x')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('accepts a verified token', async () => {
    verify.mockResolvedValue(verified);
    await expect(provider.verifyAccessToken('dmcp_at_a')).resolves.toMatchObject({ clientId: 'client-1', extra: { connection: verified } });
  });
});

describe('resolveResource', () => {
  it('defaults to the gateway when no resource is asked for', () => {
    expect(resolveResource(undefined, RESOURCES)).toBe(`${BASE}/mcp`);
  });

  it('matches a connector URL given as a string or a URL, trailing slash or not', () => {
    expect(resolveResource(`${BASE}/pods/mcp/`, RESOURCES)).toBe(`${BASE}/pods/mcp`);
    expect(resolveResource(new URL(`${BASE}/pods/mcp`), RESOURCES)).toBe(`${BASE}/pods/mcp`);
  });

  it('refuses a resource that is not one of ours', () => {
    expect(() => resolveResource('https://evil.example/mcp', RESOURCES)).toThrow(InvalidTargetError);
  });
});

describe('provider.authorize', () => {
  const res = () => ({ redirect: jest.fn() }) as unknown as Response & { redirect: jest.Mock };
  const params = { redirectUri: CLIENT.redirect_uris[0], codeChallenge: 'challenge', state: 'state-1', scopes: ['mcp:read'] };

  it('opens a consent request and sends the person to the consent page', async () => {
    open.mockResolvedValue('req-42');
    const response = res();
    await provider.authorize(CLIENT, { ...params, resource: new URL(`${BASE}/pods/mcp`) }, response);
    expect(open).toHaveBeenCalledWith({
      clientId: 'client-1',
      redirectUri: CLIENT.redirect_uris[0],
      codeChallenge: 'challenge',
      state: 'state-1',
      scopes: ['mcp:read'],
      resource: `${BASE}/pods/mcp`,
    });
    expect(response.redirect).toHaveBeenCalledWith(302, `${BASE}/connect?request=req-42`);
  });

  it('refuses a scope the server does not support before opening anything', async () => {
    await expect(provider.authorize(CLIENT, { ...params, scopes: ['mcp:read', 'admin:all'] }, res())).rejects.toBeInstanceOf(InvalidScopeError);
    expect(open).not.toHaveBeenCalled();
  });

  it('refuses a resource that is not one of the connectors', async () => {
    await expect(provider.authorize(CLIENT, { ...params, resource: new URL('https://evil.example/mcp') }, res())).rejects.toBeInstanceOf(InvalidTargetError);
  });
});

describe('provider grants', () => {
  it('exchanges a code for the token response, resolving the resource asked for', async () => {
    consume.mockResolvedValue({ pair: PAIR, scopes: ['mcp:read', 'mcp:write'] });
    const tokens = await provider.exchangeAuthorizationCode(CLIENT, 'code-1', 'verifier', CLIENT.redirect_uris[0], new URL(`${BASE}/pods/mcp/`));
    expect(consume).toHaveBeenCalledWith({ code: 'code-1', clientId: 'client-1', redirectUri: CLIENT.redirect_uris[0], resource: `${BASE}/pods/mcp` });
    expect(tokens).toMatchObject({ access_token: 'dmcp_at_a', refresh_token: 'dmcp_rt_r', token_type: 'Bearer', scope: 'mcp:read mcp:write' });
  });

  it('turns a refused code into invalid_grant, keeping the reason', async () => {
    consume.mockRejectedValue(new ConsentGrantError('This code was already used'));
    const error = await provider.exchangeAuthorizationCode(CLIENT, 'code-1').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InvalidGrantError);
    expect(error).toMatchObject({ message: 'This code was already used' });
  });

  it('turns a refused refresh into invalid_grant', async () => {
    rotate.mockRejectedValue(new ConnectionRefusedError('The connection was revoked'));
    await expect(provider.exchangeRefreshToken(CLIENT, 'dmcp_rt_old')).rejects.toBeInstanceOf(InvalidGrantError);
  });

  it('passes an unexpected failure on unchanged', async () => {
    challengeFor.mockRejectedValue(new Error('mongo down'));
    const error = await provider.challengeForAuthorizationCode(CLIENT, 'code-1').catch((caught: unknown) => caught);
    expect(error).not.toBeInstanceOf(InvalidGrantError);
    expect(error).toMatchObject({ message: 'mongo down' });
  });

  it('revokes by token for the client that asks', async () => {
    await provider.revokeToken?.(CLIENT, { token: 'dmcp_rt_r' });
    expect(mcpConnectionService.revokeByToken).toHaveBeenCalledWith('dmcp_rt_r', 'client-1');
  });
});

describe('clientsStore', () => {
  it('registers a client whose redirect host is trusted, always as a public client', async () => {
    create.mockImplementation(async (fields: Record<string, unknown>) => clientDoc(fields));
    const info = await clientsStore.registerClient?.(registration({ client_name: '  Claude  ', token_endpoint_auth_method: 'client_secret_post' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-1', client_name: 'Claude', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }));
    expect(info).toMatchObject({ client_id: 'client-1', token_endpoint_auth_method: 'none' });
    expect(info).not.toHaveProperty('client_secret');
  });

  it('names a nameless client "MCP client"', async () => {
    create.mockImplementation(async (fields: Record<string, unknown>) => clientDoc(fields));
    await clientsStore.registerClient?.(registration({ client_name: '   ' }));
    expect(create.mock.calls[0][0].client_name).toBe('MCP client');
  });

  it('refuses a redirect host that is not trusted, naming it', async () => {
    const error = await Promise.resolve(clientsStore.registerClient?.(registration({ redirect_uris: ['https://claude.ai/cb', 'https://evil.example/cb'] }))).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InvalidClientMetadataError);
    expect(error).toMatchObject({ message: 'Redirect host "evil.example" is not trusted. Ask an MCP manager to add it under MCP > Settings.' });
    expect(create).not.toHaveBeenCalled();
  });

  it('lets any redirect host register while untrusted clients are allowed', async () => {
    (mcpSettingsService.get as jest.Mock).mockResolvedValue(settings({ trusted_redirect_hosts: ['claude.ai'], allow_untrusted_clients: true }));
    create.mockImplementation(async (fields: Record<string, unknown>) => clientDoc(fields));
    await expect(clientsStore.registerClient?.(registration({ redirect_uris: ['https://evil.example/cb'] }))).resolves.toMatchObject({ client_id: 'client-1' });
  });

  it('finds a registered client and reports an unknown one as missing', async () => {
    findOne.mockResolvedValueOnce(clientDoc({ scope: 'mcp:read' })).mockResolvedValueOnce(null);
    await expect(clientsStore.getClient('client-1')).resolves.toMatchObject({ client_id: 'client-1', scope: 'mcp:read', client_uri: undefined });
    await expect(clientsStore.getClient('nobody')).resolves.toBeUndefined();
  });
});
