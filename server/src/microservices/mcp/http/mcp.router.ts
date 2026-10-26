import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import cors from 'cors';
import type { ApolloServer } from '@apollo/server';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { getOAuthProtectedResourceMetadataUrl, hostHeaderValidation, requireBearerAuth } from '@modelcontextprotocol/express';
import { mcpAuthRouter, metadataHandler } from '@modelcontextprotocol/server-legacy/auth';
import type { GraphQLContext } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { watchClientPresence } from '@utils/clientPresence';
import type { VerifiedConnection } from '../auth/connections.service';
import { createOAuthProvider, tokenVerifier } from '../auth/oauth.provider';
import type { CatalogSource } from '../catalog/build';
import { getCatalog, registerCatalogSource } from '../catalog/catalog';
import { MCP_ENDPOINTS } from '../catalog/endpoints';
import { canOpenEndpoint } from '../catalog/visibility';
import type { CallSession } from '../execute/pipeline';
import { GATEWAY_ENDPOINT, SUPPORTED_SCOPES } from '../mcp.constants';
import { mcpServerFactory } from '../server/mcp.server';
import { mcpSettingsService } from '../settings/settings.service';
import { connectorUrl } from '../tools/meta/shared';

/**
 * Everything mcp.duncit.com serves from the API server, on the official MCP
 * TypeScript SDK v2:
 *
 *   /.well-known/oauth-authorization-server         OAuth metadata (RFC 8414)
 *   /.well-known/oauth-protected-resource[/<k>/mcp] which server protects each connector (RFC 9728)
 *   /authorize  /token  /register  /revoke          OAuth 2.1 + PKCE + dynamic client registration
 *   /mcp                                            the gateway
 *   /<portal>/mcp                                   one connector per console
 *
 * The connectors are `createMcpHandler` endpoints: they speak the 2026-07-28
 * protocol revision and fall back to stateless serving for 2025-era clients
 * (today's Claude, ChatGPT and Gemini), from ONE server factory.
 *
 * nginx sends exactly these paths here (MCP_PATH — keep deploy/nginx in step)
 * and everything else to the console SPA. The issuer and URLs come from
 * config (MCP_URL), never from the request.
 */

export interface McpRouterDeps extends CatalogSource {
  apollo: ApolloServer<GraphQLContext>;
}

/** Only MCP paths enter the router; every other request passes straight through. */
export const MCP_PATH =
  /^\/(?:(?:[a-z0-9-]+\/)?mcp|authorize|token|register|revoke|\.well-known\/oauth-authorization-server|\.well-known\/oauth-protected-resource(?:\/(?:[a-z0-9-]+\/)?mcp)?)\/?$/;

const MCP_CORS = cors({
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Mcp-Protocol-Version', 'Mcp-Session-Id', 'Last-Event-ID'],
  exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate'],
});

const comparable = (url: string) => url.replace(/\/$/, '');

/** A gateway token opens every connector; a connector's own token opens only that one. */
export function tokenFits(tokenResource: string, endpointUrl: string, gatewayUrl: string): boolean {
  const resource = comparable(tokenResource);
  return resource === comparable(gatewayUrl) || resource === comparable(endpointUrl);
}

interface Connector {
  key: string;
  url: string;
}

/**
 * After the bearer check: is this token for this connector, may this person
 * open it — then hand the request to the SDK with the person's session riding
 * on the verified token (the factory reads it from `authInfo.extra.session`).
 */
function connectorHandler(
  deps: McpRouterDeps,
  connector: Connector,
  gatewayUrl: string,
  publicUrl: string,
  serve: (req: Request, res: Response, body: unknown) => Promise<void>
): RequestHandler {
  return async (req: Request, res: Response) => {
    const auth = req.auth;
    const connection = auth?.extra?.connection as VerifiedConnection | undefined;
    if (!auth || !connection || !tokenFits(connection.resource, connector.url, gatewayUrl)) {
      res.status(401).json({ error: 'invalid_token', error_description: 'This token was issued for another connector. Connect this URL separately.' });
      return;
    }
    if (!canOpenEndpoint(connector.key, connection.user)) {
      res.status(403).json({ error: 'insufficient_scope', error_description: 'Your account has no access to this console.' });
      return;
    }
    const session: CallSession = {
      caller: { apollo: deps.apollo, user: connection.user, req, res, isClientGone: watchClientPresence(res) },
      endpoint: connector.key,
      scopes: connection.scopes,
      connection: { id: connection.id, clientName: connection.clientName },
      publicUrl,
      catalog: getCatalog(),
      settings: await mcpSettingsService.get(),
      meta: { ip: req.ip ?? null, userAgent: req.get('user-agent') ?? null },
    };
    req.auth = { ...auth, extra: { ...auth.extra, session } };
    await serve(req, res, req.body);
  };
}

export async function buildMcpRoutes(deps: McpRouterDeps): Promise<Router> {
  const { mcpUrl, mcpPortalUrl } = await getUrlConfigs();
  const gatewayUrl = connectorUrl(mcpUrl, GATEWAY_ENDPOINT);
  const connectors: Array<Connector & { label: string }> = [
    { key: GATEWAY_ENDPOINT, label: 'gateway', url: gatewayUrl },
    ...MCP_ENDPOINTS.map((endpoint) => ({ key: endpoint.key, label: endpoint.label, url: connectorUrl(mcpUrl, endpoint.key) })),
  ];
  const provider = createOAuthProvider({ portalUrl: mcpPortalUrl, resources: connectors.map((c) => c.url) });
  const issuer = new URL(mcpUrl);
  const scopes = [...SUPPORTED_SCOPES];
  const onerror = (error: Error) => logs.server.error('mcp', 'handler', { error });
  // `auto`: a plain JSON answer, upgraded to SSE only if a tool emits progress
  // first (none do today). 2025-era clients get the SDK's stateless fallback,
  // which answers as a single SSE event — both are what clients expect.
  const serve = toNodeHandler(createMcpHandler(mcpServerFactory, { legacy: 'stateless', onerror }), { onerror });

  const routes = Router();
  // Answer only on the MCP host (the issuer's). The API process also serves
  // server.duncit.com, and the conformance suite's DNS-rebinding check expects a
  // server to refuse a foreign Host — tokens alone would make it harmless, this
  // makes it impossible.
  routes.use(hostHeaderValidation([issuer.hostname]));
  routes.use(MCP_CORS);
  routes.use(
    mcpAuthRouter({
      provider,
      issuerUrl: issuer,
      resourceServerUrl: new URL(gatewayUrl),
      scopesSupported: scopes,
      resourceName: 'Duncit MCP — gateway',
      serviceDocumentationUrl: new URL('/guide', mcpPortalUrl),
    })
  );

  const json = express.json({ limit: '1mb' });
  for (const connector of connectors) {
    const path = connector.key === GATEWAY_ENDPOINT ? '/mcp' : `/${connector.key}/mcp`;
    // The gateway's metadata document is served by mcpAuthRouter (its resourceServerUrl).
    if (connector.key !== GATEWAY_ENDPOINT) {
      routes.use(
        `/.well-known/oauth-protected-resource${path}`,
        metadataHandler({
          resource: connector.url,
          authorization_servers: [issuer.href],
          scopes_supported: scopes,
          resource_name: `Duncit MCP — ${connector.label}`,
        })
      );
    }
    routes.all(
      path,
      json,
      requireBearerAuth({ verifier: tokenVerifier, resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(new URL(connector.url)) }),
      connectorHandler(deps, connector, gatewayUrl, mcpUrl, serve)
    );
  }
  return routes;
}

/**
 * Mounted once at the app root. The routes need the MCP URL from config, which
 * is async, so they are built on the first MCP request and reused after; a
 * failed build is retried on the next request rather than cached.
 */
export function buildMcpRouter(deps: McpRouterDeps): RequestHandler {
  registerCatalogSource({ typeDefsByModule: deps.typeDefsByModule, resolvers: deps.resolvers });
  let routes: Promise<Router> | null = null;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!MCP_PATH.test(req.path)) {
      next();
      return;
    }
    routes ??= buildMcpRoutes(deps).catch((error: unknown) => {
      routes = null;
      throw error;
    });
    routes
      .then((router) => router(req, res, next))
      .catch((error: unknown) => {
        logs.server.error('mcp', 'router', { error });
        next(error);
      });
  };
}
