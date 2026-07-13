import express from 'express';
import http from 'node:http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { GraphQLClient } from 'graphql-request';
import { typeDefs, resolvers } from '../src/modules';
import { buildContext, type GraphQLContext } from '../src/context';

export interface TestServer {
  url: string;
  app: express.Express;
  client: (token?: string) => GraphQLClient;
  stop: () => Promise<void>;
}

// Boots the real GraphQL schema (all modules) on an ephemeral port so e2e
// specs exercise the full request path via graphql-request. The express app is
// also exposed for supertest-based HTTP assertions.
export async function startTestServer(): Promise<TestServer> {
  const app = express();
  const httpServer = http.createServer(app);
  const apollo = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await apollo.start();
  app.use(
    '/graphql',
    express.json({ limit: '25mb' }),
    expressMiddleware(apollo, { context: buildContext })
  );

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/graphql`;

  return {
    url,
    app,
    client: (token?: string) =>
      new GraphQLClient(url, token ? { headers: { authorization: `Bearer ${token}` } } : undefined),
    stop: async () => {
      await apollo.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

export interface TokenUser {
  id?: string;
  email?: string;
  roles?: string[];
  assigned_city?: string | null;
  assigned_zones?: string[];
}

// Mints a JWT matching what context.ts / user.service sign, so authed e2e and
// integration tests can act as any role without a login round-trip.
export function signToken(user: TokenUser = {}): string {
  const payload = {
    id: user.id ?? new Types.ObjectId().toString(),
    email: user.email ?? 'test@duncit.com',
    roles: user.roles ?? [],
    assigned_city: user.assigned_city ?? null,
    assigned_zones: user.assigned_zones ?? [],
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
}

export const adminToken = (over: TokenUser = {}) => signToken({ roles: ['SUPER_ADMIN'], ...over });

// Builds a GraphQLContext for invoking resolvers directly (no HTTP) in
// integration/unit specs — handy for covering role-gated resolver branches.
export function makeContext(user: TokenUser | null = null): GraphQLContext {
  return {
    req: {} as never,
    res: {} as never,
    user: user
      ? {
          id: user.id ?? new Types.ObjectId().toString(),
          email: user.email ?? null,
          roles: user.roles ?? [],
          assigned_city: user.assigned_city ?? null,
          assigned_zones: user.assigned_zones ?? [],
        }
      : null,
    device_id: null,
  };
}
