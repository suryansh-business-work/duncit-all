import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { identityForToken } from '@modules/access/auth/token-identity';
import { hasPortalAccess } from '@modules/portals/portal.gate';
import { logs } from '@observability/log';
import { AUTH_CODE_TTL_SECONDS, AUTH_REQUEST_TTL_SECONDS, MCP_PORTAL_KEY, SCOPE_READ, SCOPE_WRITE } from '../mcp.constants';
import { mcpSettingsService } from '../settings/settings.service';
import { mcpConnectionService } from './connections.service';
import { McpAuthRequestModel, McpClientModel, type IMcpAuthRequest } from './oauth.models';
import { randomToken, sha256, type TokenPair } from './tokens';

/**
 * The consent step between /authorize and /token.
 *
 * /authorize opens a request and sends the person to mcp.duncit.com/connect.
 * They sign in there with the normal console login — password, OTP, Google,
 * and the authenticator code if they set one up — see which app is asking,
 * where it will send them back, and whether it may write. Approving mints a
 * single-use code bound to that client, redirect URI and PKCE challenge; /token
 * consumes it exactly once.
 */

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

export class ConsentGrantError extends Error {}

export interface OpenRequestInput {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scopes: string[];
  resource: string;
}

const redirectHost = (uri: string): string => new URL(uri).hostname;

/** A pending request this person may still decide, or a GraphQL error saying why not. */
async function pendingRequest(id: string): Promise<IMcpAuthRequest> {
  const request = await McpAuthRequestModel.findOne({ request_id: String(id) });
  if (!request || request.expires_at.getTime() <= Date.now()) {
    return fail('NOT_FOUND', 'This connection request has expired. Start connecting again from your AI app.');
  }
  if (request.status !== 'PENDING') return fail('CONFLICT', 'This connection request was already answered.');
  return request;
}

function assertMayConnect(user: AuthUser): void {
  if (!hasPortalAccess(MCP_PORTAL_KEY, user.roles)) {
    fail('FORBIDDEN', 'Your account does not have MCP access. Ask an admin for the MCP User role.');
  }
}

/**
 * The redirect back to the app. `iss` is always set (RFC 9207): the server's
 * metadata advertises `authorization_response_iss_parameter_supported`, so a
 * client may reject a response without it — and it is what stops a code from
 * one authorization server being replayed as another's.
 */
function redirectWith(request: IMcpAuthRequest, issuer: string, params: Record<string, string>): string {
  const url = new URL(request.redirect_uri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (request.state) url.searchParams.set('state', request.state);
  url.searchParams.set('iss', issuer);
  return url.toString();
}

/** A code already exchanged once has leaked: end the connection its first use made. */
async function revokeIfReplayed(codeHash: string): Promise<void> {
  const replayed = await McpAuthRequestModel.findOne({ code_hash: codeHash, status: 'USED' });
  if (replayed?.connection_id) {
    await mcpConnectionService.revokeById(String(replayed.connection_id), 'authorization code replayed');
  }
}

export const mcpConsentService = {
  async open(input: OpenRequestInput): Promise<string> {
    const requestId = randomToken();
    await McpAuthRequestModel.create({
      request_id: requestId,
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      code_challenge: input.codeChallenge,
      state: input.state ?? null,
      scopes: input.scopes,
      resource: input.resource,
      expires_at: new Date(Date.now() + AUTH_REQUEST_TTL_SECONDS * 1000),
    });
    return requestId;
  },

  /**
   * What the consent page shows. Anyone signed in may see it — and decline —
   * but only an account with MCP access may approve (`can_approve`).
   */
  async describe(id: string, user: AuthUser, endpointLabel: (resource: string) => string) {
    const request = await pendingRequest(id);
    const [client, settings] = await Promise.all([
      McpClientModel.findOne({ client_id: request.client_id }).lean(),
      mcpSettingsService.get(),
    ]);
    const host = redirectHost(request.redirect_uri);
    return {
      id: request.request_id,
      client_name: client?.client_name ?? 'Unknown app',
      client_uri: client?.client_uri ?? null,
      redirect_host: host,
      trusted: settings.trusted_redirect_hosts.includes(host),
      // A client that names no scope is asking for everything the server offers.
      requests_write: request.scopes.length === 0 || request.scopes.includes(SCOPE_WRITE),
      resource: request.resource,
      endpoint_label: endpointLabel(request.resource),
      expires_at: request.expires_at.toISOString(),
      can_approve: hasPortalAccess(MCP_PORTAL_KEY, user.roles),
    };
  },

  async approve(id: string, user: AuthUser, allowWrite: boolean, issuer: string): Promise<{ redirect_url: string }> {
    assertMayConnect(user);
    const request = await pendingRequest(id);
    const wantsWrite = request.scopes.length === 0 || request.scopes.includes(SCOPE_WRITE);
    const granted = allowWrite && wantsWrite ? [SCOPE_READ, SCOPE_WRITE] : [SCOPE_READ];
    const code = randomToken();
    const decided = await McpAuthRequestModel.findOneAndUpdate(
      { _id: request._id, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          user_id: new Types.ObjectId(user.id),
          granted_scopes: granted,
          code_hash: sha256(code),
          code_expires_at: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
        },
      },
      { new: true }
    );
    if (!decided) return fail('CONFLICT', 'This connection request was already answered.');
    logs.server.info('mcp', 'consentApproved', { userId: user.id, clientId: request.client_id, scopes: granted });
    return { redirect_url: redirectWith(decided, issuer, { code }) };
  },

  async deny(id: string, user: AuthUser, issuer: string): Promise<{ redirect_url: string }> {
    const request = await pendingRequest(id);
    const decided = await McpAuthRequestModel.findOneAndUpdate(
      { _id: request._id, status: 'PENDING' },
      { $set: { status: 'DENIED', user_id: new Types.ObjectId(user.id) } },
      { new: true }
    );
    if (!decided) return fail('CONFLICT', 'This connection request was already answered.');
    logs.server.info('mcp', 'consentDenied', { userId: user.id, clientId: request.client_id });
    return {
      redirect_url: redirectWith(decided, issuer, {
        error: 'access_denied',
        error_description: 'The person declined to connect this app.',
      }),
    };
  },

  /**
   * The PKCE challenge an approved code was issued against. The token endpoint
   * asks for it BEFORE the exchange, so this is where a replayed code is first
   * seen — and where the connection it made must end (RFC 6749 §4.1.2).
   */
  async challengeFor(code: string, clientId: string): Promise<string> {
    const codeHash = sha256(code);
    const request = await McpAuthRequestModel.findOne({ code_hash: codeHash, client_id: clientId, status: 'APPROVED' });
    if (!request) {
      await revokeIfReplayed(codeHash);
      throw new ConsentGrantError('Invalid authorization code');
    }
    return request.code_challenge;
  },

  /**
   * Exchange an approved code for a connection — once. A second attempt with
   * the same code means it leaked, so the connection the first one made ends.
   */
  async consume(input: {
    code: string;
    clientId: string;
    redirectUri?: string;
    resource?: string;
  }): Promise<{ pair: TokenPair; scopes: string[] }> {
    const codeHash = sha256(input.code);
    const request = await McpAuthRequestModel.findOneAndUpdate(
      { code_hash: codeHash, client_id: input.clientId, status: 'APPROVED' },
      { $set: { status: 'USED' } },
      { new: true }
    );
    if (!request) {
      await revokeIfReplayed(codeHash);
      throw new ConsentGrantError('Invalid authorization code');
    }
    if (!request.code_expires_at || request.code_expires_at.getTime() <= Date.now()) {
      throw new ConsentGrantError('Authorization code expired');
    }
    if (input.redirectUri && input.redirectUri !== request.redirect_uri) {
      throw new ConsentGrantError('redirect_uri does not match the authorization request');
    }
    if (input.resource && input.resource !== request.resource) {
      throw new ConsentGrantError('resource does not match the authorization request');
    }
    const user = await identityForToken(String(request.user_id), Math.floor(Date.now() / 1000));
    if (!user || !hasPortalAccess(MCP_PORTAL_KEY, user.roles)) {
      throw new ConsentGrantError('This account can no longer use MCP');
    }
    const client = await McpClientModel.findOne({ client_id: input.clientId }).lean();
    const { id, pair } = await mcpConnectionService.create({
      user,
      clientId: input.clientId,
      clientName: client?.client_name ?? 'MCP client',
      scopes: request.granted_scopes,
      resource: request.resource,
    });
    await McpAuthRequestModel.updateOne({ _id: request._id }, { $set: { connection_id: new Types.ObjectId(id) } });
    return { pair, scopes: [...request.granted_scopes] };
  },
};
