import type { Request, Response } from 'express';
import type { ApolloServer } from '@apollo/server';
import type { AuthUser, GraphQLContext } from '@context';
import { getCatalog } from '@microservices/mcp/catalog/catalog';
import type { CallSession } from '@microservices/mcp/execute/pipeline';
import { GATEWAY_ENDPOINT } from '@microservices/mcp/mcp.constants';
import { mcpSettingsService } from '@microservices/mcp/settings/settings.service';
import { ASK_DUNCIT_CLIENT_NAME } from '../askDuncit.constants';

/**
 * The bridge from Ask Duncit to the MCP execution pipeline: a CallSession for
 * the signed-in person, so every tool the assistant runs goes through the same
 * path an AI client connected over MCP takes — refusal rules, argument
 * validation, the injection guard, Apollo as the person (resolver RBAC, pod
 * history, audit rows, notifications) and one MCP activity row per call.
 *
 * The Apollo server is handed over at start-up (index.ts), like the MCP
 * router's, because importing it here would be an import cycle.
 */

let apollo: ApolloServer<GraphQLContext> | null = null;

export function registerAskDuncitApollo(server: ApolloServer<GraphQLContext>): void {
  apollo = server;
}

export function askDuncitApollo(): ApolloServer<GraphQLContext> {
  if (!apollo) throw new Error('Ask Duncit has no Apollo server yet — registerAskDuncitApollo runs at server start');
  return apollo;
}

export interface SessionInput {
  user: AuthUser;
  req: Request;
  res: Response;
  scopes: readonly string[];
}

export async function buildCallSession(input: SessionInput): Promise<CallSession> {
  return {
    caller: {
      apollo: askDuncitApollo(),
      user: input.user,
      req: input.req,
      res: input.res,
      // The turn runs after the HTTP response is sent (it streams over the
      // socket), so "the client went away" is not a reason to stop a tool.
      isClientGone: () => false,
    },
    endpoint: GATEWAY_ENDPOINT,
    scopes: input.scopes,
    connection: { id: '', clientName: ASK_DUNCIT_CLIENT_NAME },
    publicUrl: '',
    catalog: getCatalog(),
    settings: await mcpSettingsService.get(),
    meta: { ip: input.req.ip ?? null, userAgent: input.req.get?.('user-agent') ?? null },
  };
}
