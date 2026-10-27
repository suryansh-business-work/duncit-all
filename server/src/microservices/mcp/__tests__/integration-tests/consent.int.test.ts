import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { mcpConnectionService } from '../../auth/connections.service';
import { ConsentGrantError, mcpConsentService, type OpenRequestInput } from '../../auth/consent.service';
import { McpAuthRequestModel, McpClientModel, McpConnectionModel } from '../../auth/oauth.models';
import { sha256 } from '../../auth/tokens';
import { AUTH_CODE_TTL_SECONDS, AUTH_REQUEST_TTL_SECONDS } from '../../mcp.constants';
import { mcpSettingsService } from '../../settings/settings.service';

/**
 * The consent step between /authorize and /token: open a request, show it on
 * the consent page, let the person approve (minting a single-use code bound to
 * the client, redirect URI and PKCE challenge) or decline, then consume the
 * code exactly once.
 */

const PODS = 'https://mcp.test.duncit.com/pods/mcp';
const GATEWAY = 'https://mcp.test.duncit.com/mcp';
const REDIRECT = 'http://localhost:8765/callback';
/** The authorization server's issuer, as its metadata names it (RFC 9207 `iss`). */
const ISSUER = 'https://mcp.test.duncit.com/';
const CHALLENGE =createHash('sha256').update(randomBytes(32).toString('base64url')).digest('base64url');

async function seedUser(roles: string[] = ['MCP_USER']): Promise<AuthUser> {
  const email = `consent-${new Types.ObjectId().toHexString()}@duncit.com`;
  const doc = await UserModel.create({
    auth: { email },
    profile: { first_name: 'Meera', last_name: 'Iyer' },
    metadata: { role_keys: roles },
  });
  return { id: String(doc._id), email, roles };
}

async function seedClient(over: { name?: string; redirectUris?: string[] } = {}): Promise<string> {
  const clientId = randomUUID();
  await McpClientModel.create({
    client_id: clientId,
    client_name: over.name ?? 'Claude',
    client_uri: 'https://claude.ai',
    redirect_uris: over.redirectUris ?? [REDIRECT],
    client_id_issued_at: 1_790_000_000,
  });
  return clientId;
}

const open = (clientId: string, over: Partial<OpenRequestInput> = {}) =>
  mcpConsentService.open({
    clientId,
    redirectUri: REDIRECT,
    codeChallenge: CHALLENGE,
    state: 'state-xyz',
    scopes: ['mcp:read', 'mcp:write'],
    resource: PODS,
    ...over,
  });

async function approvedCode(user: AuthUser, clientId: string, over: Partial<OpenRequestInput> = {}, allowWrite = true) {
  const requestId = await open(clientId, over);
  const { redirect_url } = await mcpConsentService.approve(requestId, user, allowWrite, ISSUER);
  return { requestId, code: new URL(redirect_url).searchParams.get('code') ?? '' };
}

const requestDoc = (requestId: string) => McpAuthRequestModel.findOne({ request_id: requestId }).orFail().lean();
const label = (resource: string) => `label for ${resource}`;

beforeEach(() => {
  mcpSettingsService.clearCache();
});

afterEach(() => {
  mcpSettingsService.clearCache();
});

describe('mcpConsentService.open', () => {
  it('stores a PENDING request for ten minutes, keyed by a fresh random id', async () => {
    const clientId = await seedClient();
    const before = Date.now();

    const requestId = await open(clientId, { scopes: ['mcp:read'], state: 'abc' });
    const second = await open(clientId);

    expect(requestId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(requestId);
    const request = await requestDoc(requestId);
    expect(request).toMatchObject({
      client_id: clientId,
      redirect_uri: REDIRECT,
      code_challenge: CHALLENGE,
      state: 'abc',
      scopes: ['mcp:read'],
      resource: PODS,
      status: 'PENDING',
      user_id: null,
      code_hash: null,
      connection_id: null,
    });
    const ttl = request.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(AUTH_REQUEST_TTL_SECONDS * 1000);
    expect(ttl).toBeLessThan(AUTH_REQUEST_TTL_SECONDS * 1000 + 5_000);
  });

  it('stores a missing state as null', async () => {
    const requestId = await open(await seedClient(), { state: undefined });

    expect((await requestDoc(requestId)).state).toBeNull();
  });
});

describe('mcpConsentService.describe — the consent page', () => {
  it('shows the app, where it sends the person back, whether that host is trusted and what it asks for', async () => {
    const clientId = await seedClient();
    const requestId = await open(clientId);

    const view = await mcpConsentService.describe(requestId, await seedUser(), label);

    expect(view).toEqual({
      id: requestId,
      client_name: 'Claude',
      client_uri: 'https://claude.ai',
      redirect_host: 'localhost',
      trusted: true,
      requests_write: true,
      resource: PODS,
      endpoint_label: `label for ${PODS}`,
      expires_at: expect.any(String),
      can_approve: true,
    });
    expect(view.expires_at).toBe((await requestDoc(requestId)).expires_at.toISOString());
  });

  it('flags an untrusted host, a read-only ask, and an account that may only decline', async () => {
    const clientId = await seedClient({ redirectUris: ['https://evil.example/cb'] });
    const requestId = await open(clientId, { redirectUri: 'https://evil.example/cb', scopes: ['mcp:read'] });

    const view = await mcpConsentService.describe(requestId, await seedUser(['FINANCE_MANAGER']), label);

    expect(view).toMatchObject({ redirect_host: 'evil.example', trusted: false, requests_write: false, can_approve: false });
  });

  it('reads the trusted list from the MCP settings, so a host an MCP manager adds is trusted at once', async () => {
    const clientId = await seedClient({ redirectUris: ['https://gemini.google.com/cb'] });
    const requestId = await open(clientId, { redirectUri: 'https://gemini.google.com/cb' });
    const user = await seedUser();
    expect((await mcpConsentService.describe(requestId, user, label)).trusted).toBe(false);

    await mcpSettingsService.update({ trusted_redirect_hosts: ['gemini.google.com'] }, new Types.ObjectId().toHexString());

    expect((await mcpConsentService.describe(requestId, user, label)).trusted).toBe(true);
  });

  it('treats a request that names no scope as asking for write', async () => {
    const requestId = await open(await seedClient(), { scopes: [] });

    expect((await mcpConsentService.describe(requestId, await seedUser(), label)).requests_write).toBe(true);
  });

  it('calls a client that has since disappeared "Unknown app"', async () => {
    const clientId = await seedClient();
    const requestId = await open(clientId);
    await McpClientModel.deleteOne({ client_id: clientId });

    expect(await mcpConsentService.describe(requestId, await seedUser(), label)).toMatchObject({
      client_name: 'Unknown app',
      client_uri: null,
    });
  });

  it('answers NOT_FOUND for an unknown or expired request and CONFLICT for an answered one', async () => {
    const clientId = await seedClient();
    const user = await seedUser();
    const expired = await open(clientId);
    await McpAuthRequestModel.updateOne({ request_id: expired }, { $set: { expires_at: new Date(Date.now() - 1) } });
    const answered = await open(clientId);
    await mcpConsentService.deny(answered, user, ISSUER);

    await expect(mcpConsentService.describe('no-such-request', user, label)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(mcpConsentService.describe(expired, user, label)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(mcpConsentService.describe(answered, user, label)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });
});

describe('mcpConsentService.approve and deny', () => {
  it('approving read & write grants both scopes and redirects with a one-time code, the state and the issuer', async () => {
    const user = await seedUser();
    const requestId = await open(await seedClient(), { state: 'keep-me' });
    const before = Date.now();

    const { redirect_url } = await mcpConsentService.approve(requestId, user, true, ISSUER);

    const back = new URL(redirect_url);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT);
    expect(back.searchParams.get('state')).toBe('keep-me');
    expect(back.searchParams.get('iss')).toBe(ISSUER);
    const code = back.searchParams.get('code') ?? '';
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const request = await requestDoc(requestId);
    expect(request).toMatchObject({ status: 'APPROVED', granted_scopes: ['mcp:read', 'mcp:write'], code_hash: sha256(code) });
    expect(String(request.user_id)).toBe(user.id);
    // Only the hash is kept: a copy of the database cannot be exchanged.
    expect(JSON.stringify(request)).not.toContain(code);
    const ttl = (request.code_expires_at?.getTime() ?? 0) - before;
    expect(ttl).toBeGreaterThanOrEqual(AUTH_CODE_TTL_SECONDS * 1000);
    expect(ttl).toBeLessThan(AUTH_CODE_TTL_SECONDS * 1000 + 5_000);
  });

  it('keeps the redirect URI’s own query and adds no state when the client sent none — but always the issuer', async () => {
    const clientId = await seedClient({ redirectUris: ['http://localhost:8765/callback?app=cli'] });
    const requestId = await open(clientId, { redirectUri: 'http://localhost:8765/callback?app=cli', state: undefined });

    const { redirect_url } = await mcpConsentService.approve(requestId, await seedUser(), true, ISSUER);

    const back = new URL(redirect_url);
    expect(back.searchParams.get('app')).toBe('cli');
    expect(back.searchParams.has('code')).toBe(true);
    expect(back.searchParams.has('state')).toBe(false);
    expect(back.searchParams.get('iss')).toBe(ISSUER);
  });

  it('read-only approval grants only mcp:read, and a client that asked read-only never gets write', async () => {
    const clientId = await seedClient();
    const user = await seedUser();
    const readOnly = await open(clientId);
    const askedRead = await open(clientId, { scopes: ['mcp:read'] });
    const askedNothing = await open(clientId, { scopes: [] });

    await mcpConsentService.approve(readOnly, user, false, ISSUER);
    await mcpConsentService.approve(askedRead, user, true, ISSUER);
    await mcpConsentService.approve(askedNothing, user, true, ISSUER);

    expect((await requestDoc(readOnly)).granted_scopes).toEqual(['mcp:read']);
    expect((await requestDoc(askedRead)).granted_scopes).toEqual(['mcp:read']);
    expect((await requestDoc(askedNothing)).granted_scopes).toEqual(['mcp:read', 'mcp:write']);
  });

  it('refuses an account without MCP access (FORBIDDEN) and leaves the request open', async () => {
    const requestId = await open(await seedClient());

    await expect(mcpConsentService.approve(requestId, await seedUser(['FINANCE_MANAGER']), true, ISSUER)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    expect((await requestDoc(requestId)).status).toBe('PENDING');
  });

  it('lets a super admin approve without the MCP role', async () => {
    const requestId = await open(await seedClient());

    await expect(mcpConsentService.approve(requestId, await seedUser(['SUPER_ADMIN']), true, ISSUER)).resolves.toMatchObject({
      redirect_url: expect.stringContaining('code='),
    });
  });

  it('a request is answered once: approving again, or approving an expired one, is refused', async () => {
    const clientId = await seedClient();
    const user = await seedUser();
    const requestId = await open(clientId);
    await mcpConsentService.approve(requestId, user, true, ISSUER);
    const expired = await open(clientId);
    await McpAuthRequestModel.updateOne({ request_id: expired }, { $set: { expires_at: new Date(Date.now() - 1) } });

    await expect(mcpConsentService.approve(requestId, user, true, ISSUER)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    await expect(mcpConsentService.approve(expired, user, true, ISSUER)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('two approvals racing: exactly one code is minted', async () => {
    const user = await seedUser();
    const requestId = await open(await seedClient());

    const results = await Promise.allSettled([
      mcpConsentService.approve(requestId, user, true, ISSUER),
      mcpConsentService.approve(requestId, user, true, ISSUER),
    ]);

    const won = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    expect(won).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const code = new URL(won[0].redirect_url).searchParams.get('code') ?? '';
    expect((await requestDoc(requestId)).code_hash).toBe(sha256(code));
  });

  it('declining redirects with error=access_denied and the state, and records who declined', async () => {
    const requestId = await open(await seedClient(), { state: 's-1' });
    const financeOnly = await seedUser(['FINANCE_MANAGER']);

    const { redirect_url } = await mcpConsentService.deny(requestId, financeOnly, ISSUER);

    const back = new URL(redirect_url);
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('error_description')).toBe('The person declined to connect this app.');
    expect(back.searchParams.get('state')).toBe('s-1');
    expect(back.searchParams.get('iss')).toBe(ISSUER);
    expect(back.searchParams.has('code')).toBe(false);
    const request = await requestDoc(requestId);
    expect(request.status).toBe('DENIED');
    expect(request.code_hash).toBeNull();
    expect(String(request.user_id)).toBe(financeOnly.id);
    await expect(mcpConsentService.approve(requestId, await seedUser(), true, ISSUER)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });
});

describe('mcpConsentService.challengeFor', () => {
  it('returns the PKCE challenge an approved code was issued against — to that client only', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);

    await expect(mcpConsentService.challengeFor(code, clientId)).resolves.toBe(CHALLENGE);
    await expect(mcpConsentService.challengeFor(code, 'another-client')).rejects.toThrow(
      new ConsentGrantError('Invalid authorization code')
    );
    await expect(mcpConsentService.challengeFor('made-up', clientId)).rejects.toBeInstanceOf(ConsentGrantError);
  });

  it('ends the connection a replayed code made — the token endpoint asks for the challenge first', async () => {
    const clientId = await seedClient();
    const { requestId, code } = await approvedCode(await seedUser(), clientId);
    await mcpConsentService.consume({ code, clientId });
    const { connection_id } = await requestDoc(requestId);

    await expect(mcpConsentService.challengeFor(code, clientId)).rejects.toThrow(
      new ConsentGrantError('Invalid authorization code')
    );
    const connection = await McpConnectionModel.findById(connection_id).orFail().lean();
    expect(connection.revoked_at).toBeInstanceOf(Date);
    expect(connection.revoked_reason).toBe('authorization code replayed');
  });

  it('revokes nothing for a code that was never used', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);
    await mcpConsentService.consume({ code, clientId });

    await expect(mcpConsentService.challengeFor('never-issued', clientId)).rejects.toBeInstanceOf(ConsentGrantError);
    expect(await McpConnectionModel.countDocuments({ revoked_at: { $ne: null } })).toBe(0);
  });

  it('knows no challenge for a code that was already exchanged', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);
    await mcpConsentService.consume({ code, clientId });

    await expect(mcpConsentService.challengeFor(code, clientId)).rejects.toBeInstanceOf(ConsentGrantError);
  });
});

describe('mcpConsentService.consume — the one-time code exchange', () => {
  it('turns an approved code into a connection, once, and links the request to it', async () => {
    const clientId = await seedClient({ name: 'Gemini CLI' });
    const user = await seedUser();
    const { requestId, code } = await approvedCode(user, clientId);

    const { pair, scopes } = await mcpConsentService.consume({ code, clientId, redirectUri: REDIRECT, resource: PODS });

    expect(scopes).toEqual(['mcp:read', 'mcp:write']);
    const request = await requestDoc(requestId);
    expect(request.status).toBe('USED');
    const connection = await McpConnectionModel.findById(request.connection_id).orFail().lean();
    expect(connection).toMatchObject({
      client_id: clientId,
      client_name: 'Gemini CLI',
      scopes: ['mcp:read', 'mcp:write'],
      resource: PODS,
      user_email: user.email,
      access_hash: sha256(pair.accessToken),
      refresh_hash: sha256(pair.refreshToken),
    });
    expect(String(connection.user_id)).toBe(user.id);
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ user: { id: user.id } });
  });

  it('carries a read-only grant into the connection', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId, {}, false);

    const { pair, scopes } = await mcpConsentService.consume({ code, clientId });

    expect(scopes).toEqual(['mcp:read']);
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ scopes: ['mcp:read'] });
  });

  it('names the connection "MCP client" when the client record has gone', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);
    await McpClientModel.deleteOne({ client_id: clientId });

    const { pair } = await mcpConsentService.consume({ code, clientId });

    expect((await McpConnectionModel.findOne({ access_hash: sha256(pair.accessToken) }).orFail()).client_name).toBe('MCP client');
  });

  it('a second use of the same code is refused AND ends the connection the first use made', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);
    const first = await mcpConsentService.consume({ code, clientId });

    await expect(mcpConsentService.consume({ code, clientId })).rejects.toThrow(
      new ConsentGrantError('Invalid authorization code')
    );

    await expect(mcpConnectionService.verify(first.pair.accessToken)).resolves.toBeNull();
    const connection = await McpConnectionModel.findOne({ access_hash: sha256(first.pair.accessToken) }).orFail().lean();
    expect(connection.revoked_reason).toBe('authorization code replayed');
    expect(await McpConnectionModel.countDocuments()).toBe(1);
  });

  it('refuses an unknown code and another client’s code, without burning the real one', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId);

    await expect(mcpConsentService.consume({ code: 'never-issued', clientId })).rejects.toBeInstanceOf(ConsentGrantError);
    await expect(mcpConsentService.consume({ code, clientId: 'another-client' })).rejects.toBeInstanceOf(ConsentGrantError);
    expect(await McpConnectionModel.countDocuments()).toBe(0);
    // The thief's attempt did not burn the code for the client it was issued to.
    await expect(mcpConsentService.consume({ code, clientId })).resolves.toMatchObject({ scopes: ['mcp:read', 'mcp:write'] });
  });

  it('refuses an expired code and creates no connection', async () => {
    const clientId = await seedClient();
    const { requestId, code } = await approvedCode(await seedUser(), clientId);
    await McpAuthRequestModel.updateOne({ request_id: requestId }, { $set: { code_expires_at: new Date(Date.now() - 1) } });

    await expect(mcpConsentService.consume({ code, clientId })).rejects.toThrow(new ConsentGrantError('Authorization code expired'));
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses a redirect_uri other than the request’s — and the refused attempt burns the code', async () => {
    const clientId = await seedClient({ redirectUris: [REDIRECT, 'http://localhost:8765/other'] });
    const { code } = await approvedCode(await seedUser(), clientId);

    await expect(
      mcpConsentService.consume({ code, clientId, redirectUri: 'http://localhost:8765/other' })
    ).rejects.toThrow(new ConsentGrantError('redirect_uri does not match the authorization request'));
    await expect(mcpConsentService.consume({ code, clientId, redirectUri: REDIRECT })).rejects.toBeInstanceOf(ConsentGrantError);
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses a resource other than the one approved', async () => {
    const clientId = await seedClient();
    const { code } = await approvedCode(await seedUser(), clientId, { resource: PODS });

    await expect(mcpConsentService.consume({ code, clientId, resource: GATEWAY })).rejects.toThrow(
      new ConsentGrantError('resource does not match the authorization request')
    );
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses when the person lost the MCP role between approving and the exchange', async () => {
    const clientId = await seedClient();
    const user = await seedUser(['MCP_USER', 'ALL_PODS_ACCESS']);
    const { code } = await approvedCode(user, clientId);
    await UserModel.updateOne({ _id: user.id }, { $set: { 'metadata.role_keys': ['ALL_PODS_ACCESS'] } });

    await expect(mcpConsentService.consume({ code, clientId })).rejects.toThrow(
      new ConsentGrantError('This account can no longer use MCP')
    );
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });

  it('refuses when the account was locked between approving and the exchange', async () => {
    const clientId = await seedClient();
    const user = await seedUser();
    const { code } = await approvedCode(user, clientId);
    lockAccount(user.id);
    try {
      await expect(mcpConsentService.consume({ code, clientId })).rejects.toThrow('This account can no longer use MCP');
    } finally {
      unlockAccount(user.id);
    }
    expect(await McpConnectionModel.countDocuments()).toBe(0);
  });
});
