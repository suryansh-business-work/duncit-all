import type { Response } from 'express';
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  type AuthInfo as LegacyAuthInfo,
  type AuthorizationParams,
  type OAuthRegisteredClientsStore,
  type OAuthServerProvider,
} from '@modelcontextprotocol/server-legacy/auth';
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthClientInformationFull,
  type OAuthTokenRevocationRequest,
  type OAuthTokens,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import { SUPPORTED_SCOPES } from '../mcp.constants';
import { mcpSettingsService } from '../settings/settings.service';
import { ConnectionRefusedError, mcpConnectionService } from './connections.service';
import { ConsentGrantError, mcpConsentService } from './consent.service';
import { McpClientModel, type IMcpClient } from './oauth.models';
import { tokenResponse } from './tokens';

/**
 * The OAuth authorization server, on the official SDK's router.
 *
 * The MCP TypeScript SDK v2 keeps its authorization-server helpers
 * (`mcpAuthRouter`, `OAuthServerProvider`) in `@modelcontextprotocol/server-legacy/auth`
 * — a frozen, supported copy. The router does the protocol (metadata, PKCE
 * verification, parameter validation, per-IP rate limits) and throws ITS OWN
 * error classes, so everything handed to it throws those. The MCP endpoints
 * themselves verify tokens with v2's `requireBearerAuth`, which only recognises
 * v2's `OAuthError` — hence the separate `tokenVerifier` below.
 *
 * Clients are always registered as PUBLIC — a registration asking for a client
 * secret gets `token_endpoint_auth_method: none` back — so no secret is ever
 * stored, and PKCE is what binds the code to the app that started the flow.
 */

export interface OAuthProviderConfig {
  /** Where the consent page lives (`<portal>/connect`). */
  portalUrl: string;
  /** Every resource URL a token may be issued for — the gateway first. */
  resources: readonly string[];
}

const comparable = (url: string): string => url.replace(/\/$/, '');

function toClientInfo(doc: IMcpClient): OAuthClientInformationFull {
  return {
    client_id: doc.client_id,
    client_name: doc.client_name,
    client_uri: doc.client_uri ?? undefined,
    logo_uri: doc.logo_uri ?? undefined,
    redirect_uris: [...doc.redirect_uris],
    grant_types: [...doc.grant_types],
    response_types: [...doc.response_types],
    scope: doc.scope ?? undefined,
    software_id: doc.software_id ?? undefined,
    software_version: doc.software_version ?? undefined,
    token_endpoint_auth_method: 'none',
    client_id_issued_at: doc.client_id_issued_at,
  };
}

export const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    const doc = await McpClientModel.findOne({ client_id: clientId });
    return doc ? toClientInfo(doc) : undefined;
  },

  async registerClient(client) {
    const settings = await mcpSettingsService.get();
    if (!settings.allow_untrusted_clients) {
      const untrusted = client.redirect_uris
        .map((uri) => new URL(uri).hostname)
        .find((host) => !settings.trusted_redirect_hosts.includes(host));
      if (untrusted) {
        throw new InvalidClientMetadataError(
          `Redirect host "${untrusted}" is not trusted. Ask an MCP manager to add it under MCP > Settings.`
        );
      }
    }
    const full = client as OAuthClientInformationFull;
    const doc = await McpClientModel.create({
      client_id: full.client_id,
      client_name: client.client_name?.trim() || 'MCP client',
      client_uri: client.client_uri ?? null,
      logo_uri: client.logo_uri ?? null,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types ?? ['authorization_code', 'refresh_token'],
      response_types: client.response_types ?? ['code'],
      scope: client.scope ?? null,
      software_id: client.software_id ?? null,
      software_version: client.software_version ?? null,
      client_id_issued_at: full.client_id_issued_at ?? Math.floor(Date.now() / 1000),
    });
    return toClientInfo(doc);
  },
};

/** The resource a token is for: one of our endpoint URLs, defaulting to the gateway. */
export function resolveResource(requested: URL | string | undefined, resources: readonly string[]): string {
  if (!requested) return resources[0];
  const wanted = comparable(String(requested));
  const match = resources.find((resource) => comparable(resource) === wanted);
  if (!match) throw new InvalidTargetError(`Unknown resource ${wanted}`);
  return match;
}

function assertScopes(scopes: readonly string[] | undefined): string[] {
  const requested = (scopes ?? []).filter(Boolean);
  const unknown = requested.filter((scope) => !(SUPPORTED_SCOPES as readonly string[]).includes(scope));
  if (unknown.length) throw new InvalidScopeError(`Unsupported scope: ${unknown.join(' ')}`);
  return requested;
}

/** Turns the services' own refusals into the OAuth error the router reports. */
async function asGrant<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ConsentGrantError || error instanceof ConnectionRefusedError) {
      throw new InvalidGrantError(error.message);
    }
    throw error;
  }
}

/** The verified connection as the SDK's AuthInfo, or null when the token must be refused. */
async function authInfoFor(token: string): Promise<AuthInfo | null> {
  const verified = await mcpConnectionService.verify(token);
  if (!verified) return null;
  return {
    token,
    clientId: verified.clientId,
    scopes: verified.scopes,
    expiresAt: verified.expiresAt,
    resource: new URL(verified.resource),
    extra: { connection: verified },
  };
}

/** For the MCP endpoints' `requireBearerAuth` (v2): a refusal must be v2's OAuthError, or it answers 500. */
export const tokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    const info = await authInfoFor(token);
    if (!info) throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid or expired access token');
    return info;
  },
};

export function createOAuthProvider(config: OAuthProviderConfig): OAuthServerProvider {
  return {
    clientsStore,

    async authorize(client, params: AuthorizationParams, res: Response) {
      const scopes = assertScopes(params.scopes);
      const resource = resolveResource(params.resource, config.resources);
      const requestId = await mcpConsentService.open({
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        state: params.state,
        scopes,
        resource,
      });
      const consent = new URL('/connect', config.portalUrl);
      consent.searchParams.set('request', requestId);
      res.redirect(302, consent.toString());
    },

    challengeForAuthorizationCode(client, code) {
      return asGrant(() => mcpConsentService.challengeFor(code, client.client_id));
    },

    exchangeAuthorizationCode(client, code, _verifier, redirectUri, resource): Promise<OAuthTokens> {
      return asGrant(async () => {
        const { pair, scopes } = await mcpConsentService.consume({
          code,
          clientId: client.client_id,
          redirectUri,
          resource: resource ? resolveResource(resource, config.resources) : undefined,
        });
        return tokenResponse(pair, scopes);
      });
    },

    exchangeRefreshToken(client, refreshToken): Promise<OAuthTokens> {
      return asGrant(async () => {
        const { pair, scopes } = await mcpConnectionService.rotate(refreshToken, client.client_id);
        return tokenResponse(pair, scopes);
      });
    },

    // Required by the provider interface; the MCP endpoints use tokenVerifier.
    async verifyAccessToken(token): Promise<LegacyAuthInfo> {
      const info = await authInfoFor(token);
      if (!info) throw new InvalidTokenError('Invalid or expired access token');
      return info;
    },

    async revokeToken(client, request: OAuthTokenRevocationRequest) {
      await mcpConnectionService.revokeByToken(request.token, client.client_id);
    },
  };
}
