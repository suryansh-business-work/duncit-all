import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Types } from 'mongoose';
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} from '@modelcontextprotocol/server-legacy/auth';
import { OAuthError, OAuthErrorCode, type OAuthClientInformationFull } from '@modelcontextprotocol/server';
import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { mcpConsentService } from '../../auth/consent.service';
import { McpAuthRequestModel, McpClientModel, McpConnectionModel } from '../../auth/oauth.models';
import { clientsStore, createOAuthProvider, tokenVerifier } from '../../auth/oauth.provider';
import { sha256 } from '../../auth/tokens';
import { ACCESS_TOKEN_TTL_SECONDS, AUTH_REQUEST_TTL_SECONDS } from '../../mcp.constants';
import { mcpSettingsService } from '../../settings/settings.service';

/**
 * The OAuth provider the SDK's authorization-server router runs on, called
 * directly against a real database: dynamic client registration, /authorize,
 * the code and refresh exchanges, token verification and revocation — and the
 * translation of the services' own refusals into the OAuth errors the router
 * reports. (The consent decision itself is covered in consent.int.test.ts.)
 */

const PORTAL = 'https://mcp.test.duncit.com';
const ISSUER = `${PORTAL}/`;
const GATEWAY = `${PORTAL}/mcp`;
const PODS = `${PORTAL}/pods/mcp`;
const REDIRECT = 'http://localhost:8765/callback';
const provider = createOAuthProvider({ portalUrl: PORTAL, resources: [GATEWAY, PODS] });

const CHALLENGE = createHash('sha256').update(randomBytes(32).toString('base64url')).digest('base64url');

async function seedUser(roles: string[] = ['MCP_USER']): Promise<AuthUser> {
  const email = `provider-${new Types.ObjectId().toHexString()}@duncit.com`;
  const doc = await UserModel.create({ auth: { email }, metadata: { role_keys: roles } });
  return { id: String(doc._id), email, roles };
}

async function register(over: Partial<OAuthClientInformationFull> = {}): Promise<OAuthClientInformationFull> {
  if (!clientsStore.registerClient) throw new Error('dynamic client registration must be supported');
  const client: OAuthClientInformationFull = {
    client_id: randomUUID(),
    client_id_issued_at: 1_790_000_000,
    client_name: 'Claude',
    redirect_uris: [REDIRECT],
    ...over,
  };
  return clientsStore.registerClient(client);
}

/** A stand-in for the Express response /authorize redirects with. */
function redirectRecorder() {
  const redirect = jest.fn();
  return {
    res: { redirect } as unknown as Response,
    redirect,
    location: (): string => String(redirect.mock.calls[0]?.[1] ?? ''),
  };
}

interface AuthorizeOptions {
  scopes?: string[];
  resource?: string;
  state?: string;
}

async function openRequest(client: OAuthClientInformationFull, options: AuthorizeOptions = {}): Promise<string> {
  const { res, location } = redirectRecorder();
  await provider.authorize(
    client,
    {
      codeChallenge: CHALLENGE,
      redirectUri: REDIRECT,
      scopes: options.scopes ?? ['mcp:read', 'mcp:write'],
      state: options.state ?? 'state-xyz',
      resource: options.resource ? new URL(options.resource) : undefined,
      issuer: ISSUER,
    },
    res
  );
  return new URL(location()).searchParams.get('request') ?? '';
}

async function approvedCode(user: AuthUser, client: OAuthClientInformationFull, options: AuthorizeOptions & { allowWrite?: boolean } = {}) {
  const requestId = await openRequest(client, options);
  const { redirect_url } = await mcpConsentService.approve(requestId, user, options.allowWrite ?? true, ISSUER);
  return { requestId, code: new URL(redirect_url).searchParams.get('code') ?? '' };
}

beforeEach(() => {
  mcpSettingsService.clearCache();
});

afterEach(() => {
  mcpSettingsService.clearCache();
});

describe('clientsStore — dynamic client registration', () => {
  it('registers every client as PUBLIC: a secret the SDK generated is never returned or stored', async () => {
    const info = await register({
      client_secret: 'generated-by-the-router',
      client_secret_expires_at: 0,
      token_endpoint_auth_method: 'client_secret_post',
      client_uri: 'https://claude.ai',
    });

    expect(info.token_endpoint_auth_method).toBe('none');
    expect(info).not.toHaveProperty('client_secret');
    const doc = await McpClientModel.findOne({ client_id: info.client_id }).orFail().lean();
    expect(JSON.stringify(doc)).not.toContain('generated-by-the-router');
    expect(doc).toMatchObject({
      client_name: 'Claude',
      client_uri: 'https://claude.ai',
      redirect_uris: [REDIRECT],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_id_issued_at: 1_790_000_000,
    });
  });

  it('round-trips through getClient, and answers undefined for an unknown id', async () => {
    const info = await register({ software_id: 'claude-desktop', software_version: '1.2.3', scope: 'mcp:read' });

    await expect(clientsStore.getClient(info.client_id)).resolves.toEqual(info);
    await expect(clientsStore.getClient('never-registered')).resolves.toBeUndefined();
  });

  it('names a client that gave no name (or only spaces) "MCP client", and trims real names', async () => {
    const unnamed = await register({ client_name: '   ' });
    const spaced = await register({ client_name: '  Gemini CLI  ' });

    expect(unnamed.client_name).toBe('MCP client');
    expect(spaced.client_name).toBe('Gemini CLI');
  });

  it('refuses a redirect host that is not trusted, naming it, and stores nothing', async () => {
    const attempt = register({ redirect_uris: [REDIRECT, 'https://evil.example/cb'] });

    await expect(attempt).rejects.toBeInstanceOf(InvalidClientMetadataError);
    await expect(attempt).rejects.toThrow('Redirect host "evil.example" is not trusted');
    expect(await McpClientModel.countDocuments()).toBe(0);
  });

  it('trusts exact hosts only — a look-alike subdomain is refused', async () => {
    await expect(register({ redirect_uris: ['https://claude.ai.evil.example/cb'] })).rejects.toBeInstanceOf(
      InvalidClientMetadataError
    );
  });

  it('accepts the default trusted hosts, IPv6 loopback included', async () => {
    const info = await register({
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback', 'https://chatgpt.com/connector/cb', 'http://[::1]:7777/cb'],
    });

    expect(info.redirect_uris).toHaveLength(3);
  });

  it('lets an untrusted host register once an MCP manager allows untrusted clients', async () => {
    await mcpSettingsService.update({ allow_untrusted_clients: true }, new Types.ObjectId().toHexString());

    const info = await register({ redirect_uris: ['https://evil.example/cb'] });

    expect(info.redirect_uris).toEqual(['https://evil.example/cb']);
  });
});

describe('provider.authorize', () => {
  it('opens a PENDING request and sends the browser to <portal>/connect?request=…', async () => {
    const client = await register();
    const { res, redirect, location } = redirectRecorder();
    const before = Date.now();

    await provider.authorize(
      client,
      { codeChallenge: CHALLENGE, redirectUri: REDIRECT, scopes: ['mcp:read'], state: 'abc', resource: new URL(PODS), issuer: ISSUER },
      res
    );

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect.mock.calls[0]?.[0]).toBe(302);
    const consent = new URL(location());
    expect(`${consent.origin}${consent.pathname}`).toBe(`${PORTAL}/connect`);
    const request = await McpAuthRequestModel.findOne({ request_id: consent.searchParams.get('request') ?? '' }).orFail().lean();
    expect(request).toMatchObject({
      client_id: client.client_id,
      redirect_uri: REDIRECT,
      code_challenge: CHALLENGE,
      state: 'abc',
      scopes: ['mcp:read'],
      resource: PODS,
      status: 'PENDING',
    });
    const ttl = request.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(AUTH_REQUEST_TTL_SECONDS * 1000);
    expect(ttl).toBeLessThan(AUTH_REQUEST_TTL_SECONDS * 1000 + 5_000);
  });

  it('defaults a request with no resource to the gateway, and matches a resource with a trailing slash', async () => {
    const client = await register();

    const toGateway = await openRequest(client);
    const toPods = await openRequest(client, { resource: `${PODS}/` });

    expect((await McpAuthRequestModel.findOne({ request_id: toGateway }).orFail()).resource).toBe(GATEWAY);
    expect((await McpAuthRequestModel.findOne({ request_id: toPods }).orFail()).resource).toBe(PODS);
  });

  it('drops empty scope tokens (a doubled space) rather than refusing them', async () => {
    const client = await register();

    const requestId = await openRequest(client, { scopes: ['mcp:read', '', 'mcp:write'] });

    expect((await McpAuthRequestModel.findOne({ request_id: requestId }).orFail()).scopes).toEqual(['mcp:read', 'mcp:write']);
  });

  it('refuses an unsupported scope with InvalidScopeError and opens nothing', async () => {
    const client = await register();

    await expect(openRequest(client, { scopes: ['mcp:read', 'admin:all'] })).rejects.toThrow(
      new InvalidScopeError('Unsupported scope: admin:all')
    );
    expect(await McpAuthRequestModel.countDocuments()).toBe(0);
  });

  it('refuses a resource that is not one of this server’s connectors with InvalidTargetError', async () => {
    const client = await register();

    await expect(openRequest(client, { resource: 'https://elsewhere.example/mcp' })).rejects.toBeInstanceOf(
      InvalidTargetError
    );
    expect(await McpAuthRequestModel.countDocuments()).toBe(0);
  });
});

describe('provider.challengeForAuthorizationCode', () => {
  it('returns the PKCE challenge an approved code was issued against — to that client only', async () => {
    const client = await register();
    const other = await register();
    const { code } = await approvedCode(await seedUser(), client);

    await expect(provider.challengeForAuthorizationCode(client, code)).resolves.toBe(CHALLENGE);
    await expect(provider.challengeForAuthorizationCode(other, code)).rejects.toBeInstanceOf(InvalidGrantError);
    await expect(provider.challengeForAuthorizationCode(client, 'made-up')).rejects.toThrow(
      new InvalidGrantError('Invalid authorization code')
    );
  });
});

describe('provider.exchangeAuthorizationCode', () => {
  it('exchanges an approved code for Bearer tokens and a connection', async () => {
    const client = await register();
    const user = await seedUser();
    const { requestId, code } = await approvedCode(user, client, { resource: PODS });

    const tokens = await provider.exchangeAuthorizationCode(client, code, undefined, REDIRECT, new URL(PODS));

    expect(tokens).toEqual({
      access_token: expect.stringMatching(/^dmcp_at_/),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: expect.stringMatching(/^dmcp_rt_/),
      scope: 'mcp:read mcp:write',
    });
    const request = await McpAuthRequestModel.findOne({ request_id: requestId }).orFail().lean();
    const connection = await McpConnectionModel.findById(request.connection_id).orFail().lean();
    expect(connection).toMatchObject({
      client_id: client.client_id,
      client_name: 'Claude',
      resource: PODS,
      access_hash: sha256(tokens.access_token),
    });
    expect(String(connection.user_id)).toBe(user.id);
  });

  it('matches the resource with or without a trailing slash', async () => {
    const client = await register();
    const { code } = await approvedCode(await seedUser(), client, { resource: PODS });

    await expect(
      provider.exchangeAuthorizationCode(client, code, undefined, REDIRECT, new URL(`${PODS}/`))
    ).resolves.toMatchObject({ token_type: 'Bearer' });
  });

  it('a code works once: the second use is an InvalidGrantError AND ends the connection the first one made', async () => {
    const client = await register();
    const { code } = await approvedCode(await seedUser(), client);
    const first = await provider.exchangeAuthorizationCode(client, code);

    await expect(provider.exchangeAuthorizationCode(client, code)).rejects.toThrow(
      new InvalidGrantError('Invalid authorization code')
    );

    await expect(provider.verifyAccessToken(first.access_token)).rejects.toBeInstanceOf(InvalidTokenError);
    const connection = await McpConnectionModel.findOne({ access_hash: sha256(first.access_token) }).orFail().lean();
    expect(connection.revoked_reason).toBe('authorization code replayed');
  });

  it('reports every consent refusal as InvalidGrantError, with the service’s reason', async () => {
    const client = await register({ redirect_uris: [REDIRECT, 'http://localhost:8765/other'] });
    const user = await seedUser();

    const expired = await approvedCode(user, client);
    await McpAuthRequestModel.updateOne({ request_id: expired.requestId }, { $set: { code_expires_at: new Date(Date.now() - 1) } });
    await expect(provider.exchangeAuthorizationCode(client, expired.code)).rejects.toThrow(
      new InvalidGrantError('Authorization code expired')
    );

    const elsewhere = await approvedCode(user, client);
    await expect(
      provider.exchangeAuthorizationCode(client, elsewhere.code, undefined, 'http://localhost:8765/other')
    ).rejects.toThrow(new InvalidGrantError('redirect_uri does not match the authorization request'));

    const forPods = await approvedCode(user, client, { resource: PODS });
    await expect(
      provider.exchangeAuthorizationCode(client, forPods.code, undefined, REDIRECT, new URL(GATEWAY))
    ).rejects.toThrow(new InvalidGrantError('resource does not match the authorization request'));

    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses an unknown resource with InvalidTargetError before the code is looked at', async () => {
    const client = await register();
    const { code } = await approvedCode(await seedUser(), client, { resource: PODS });

    await expect(
      provider.exchangeAuthorizationCode(client, code, undefined, REDIRECT, new URL('https://elsewhere.example/mcp'))
    ).rejects.toBeInstanceOf(InvalidTargetError);
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses when the person lost the MCP role between approving and the exchange', async () => {
    const client = await register();
    const user = await seedUser(['MCP_USER', 'ALL_PODS_ACCESS']);
    const { code } = await approvedCode(user, client);
    await UserModel.updateOne({ _id: user.id }, { $set: { 'metadata.role_keys': ['ALL_PODS_ACCESS'] } });

    await expect(provider.exchangeAuthorizationCode(client, code)).rejects.toThrow(
      new InvalidGrantError('This account can no longer use MCP')
    );
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });
});

describe('refresh, verification and revocation', () => {
  async function connected(scopes?: string[]) {
    const client = await register();
    const user = await seedUser();
    const { code } = await approvedCode(user, client, { resource: PODS, scopes });
    const tokens = await provider.exchangeAuthorizationCode(client, code);
    return { client, user, tokens };
  }

  it('verifies an access token into the AuthInfo the bearer middleware expects', async () => {
    const { client, user, tokens } = await connected();

    for (const info of [await provider.verifyAccessToken(tokens.access_token), await tokenVerifier.verifyAccessToken(tokens.access_token)]) {
      expect(info).toMatchObject({ token: tokens.access_token, clientId: client.client_id, scopes: ['mcp:read', 'mcp:write'] });
      expect(info.resource).toBeInstanceOf(URL);
      expect(info.resource?.href).toBe(PODS);
      expect(info.expiresAt).toBeGreaterThan(Date.now() / 1000);
      expect(info.expiresAt).toBeLessThanOrEqual(Date.now() / 1000 + ACCESS_TOKEN_TTL_SECONDS);
      expect(info.extra?.connection).toMatchObject({ clientName: 'Claude', resource: PODS, user: { id: user.id } });
    }
  });

  it('refuses a bad token with the error each caller understands: legacy InvalidTokenError, v2 OAuthError(invalid_token)', async () => {
    await expect(provider.verifyAccessToken('dmcp_at_bogus')).rejects.toThrow(
      new InvalidTokenError('Invalid or expired access token')
    );

    const refusal = tokenVerifier.verifyAccessToken('dmcp_at_bogus');
    await expect(refusal).rejects.toBeInstanceOf(OAuthError);
    await expect(refusal).rejects.toMatchObject({ code: OAuthErrorCode.InvalidToken, message: 'Invalid or expired access token' });
  });

  it('a refresh returns a new pair with the same scope; replaying the old refresh token ends the connection', async () => {
    const { client, tokens } = await connected(['mcp:read']);

    const next = await provider.exchangeRefreshToken(client, tokens.refresh_token ?? '');

    expect(next).toMatchObject({ token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL_SECONDS, scope: 'mcp:read' });
    expect(next.access_token).not.toBe(tokens.access_token);
    await expect(provider.verifyAccessToken(next.access_token)).resolves.toMatchObject({ scopes: ['mcp:read'] });
    await expect(provider.exchangeRefreshToken(client, tokens.refresh_token ?? '')).rejects.toBeInstanceOf(InvalidGrantError);
    await expect(provider.verifyAccessToken(next.access_token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('refuses a refresh by another client as an invalid grant', async () => {
    const { tokens } = await connected();
    const other = await register();

    await expect(provider.exchangeRefreshToken(other, tokens.refresh_token ?? '')).rejects.toThrow(
      new InvalidGrantError('Refresh token was issued to another client')
    );
  });

  it('revokes by either token for its own client, and ignores another client', async () => {
    if (!provider.revokeToken) throw new Error('token revocation must be supported');
    const a = await connected();
    const b = await connected();

    await provider.revokeToken(a.client, { token: a.tokens.refresh_token ?? '' });
    await provider.revokeToken(a.client, { token: b.tokens.access_token });

    await expect(provider.verifyAccessToken(a.tokens.access_token)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(provider.verifyAccessToken(b.tokens.access_token)).resolves.toMatchObject({ clientId: b.client.client_id });
  });
});
