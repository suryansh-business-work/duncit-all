import type { ApolloServerPlugin } from '@apollo/server';
import { Router, type Request } from 'express';
import { buildASTSchema, concatAST, printSchema } from 'graphql';
import type { LiteContext } from '../context';
import { typeDefs } from '../graphql/typeDefs';
import { forbidden } from '../utils/errors';
import { MCP_ASSERTION_HEADER, verifyMcpAssertion } from './assertion';

/** Lite's whole schema as SDL, built once: what mcp.duncit.com turns into tools. */
let sdl: string | null = null;
export function liteSdl(): string {
  sdl ??= printSchema(buildASTSchema(concatAST(typeDefs)));
  return sdl;
}

const assertionOf = (req: Request) => verifyMcpAssertion(req.headers[MCP_ASSERTION_HEADER]);

/**
 * GET /mcp/schema — the SDL, for a signed schema assertion only (introspection
 * is off in production, and the connector should not need it on).
 */
export function buildMcpRouter(): Router {
  const router = Router();
  router.get('/mcp/schema', (req, res) => {
    const assertion = assertionOf(req);
    if (assertion?.purpose !== 'schema') {
      res.status(401).json({ error: 'A valid MCP schema assertion is required' });
      return;
    }
    res.set('Cache-Control', 'no-store').json({ sdl: liteSdl() });
  });
  return router;
}

/**
 * A read-only MCP connection may only run queries. mcp.duncit.com refuses
 * writes on such a connection first; this is the second, independent check.
 */
export const mcpScopePlugin: ApolloServerPlugin<LiteContext> = {
  async requestDidStart() {
    return {
      async didResolveOperation({ contextValue, operation }) {
        if (contextValue.mcp?.scope === 'read' && operation?.operation === 'mutation') {
          throw forbidden('This MCP connection is read-only. Reconnect with read & write access to change anything');
        }
      },
    };
  },
};
