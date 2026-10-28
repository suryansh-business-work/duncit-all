import { afterAll, describe, expect, it, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { LiteContext } from '../../context';
import { MCP_ASSERTION_HEADER, MCP_AUDIENCE, MCP_ISSUER, type McpScope } from '../../mcp/assertion';
import { buildMcpRouter, liteSdl, mcpScopePlugin } from '../../mcp/bridge';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, mcpSecret: 'mcp-shared-secret' } };
});

const assertion = (claims: Record<string, unknown>) =>
  jwt.sign(claims, 'mcp-shared-secret', { algorithm: 'HS256', issuer: MCP_ISSUER, audience: MCP_AUDIENCE, expiresIn: 60 });

describe('GET /mcp/schema', () => {
  const app = express().use(buildMcpRouter());

  it('answers 401 without a schema assertion', async () => {
    const res = await request(app).get('/mcp/schema');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'A valid MCP schema assertion is required' });
  });

  it('answers 401 for a call assertion, which is for a person, not the schema', async () => {
    const res = await request(app).get('/mcp/schema').set(MCP_ASSERTION_HEADER, assertion({ purpose: 'call', email: 'priya@duncit.com' }));
    expect(res.status).toBe(401);
  });

  it("serves Lite's whole schema as SDL, uncached, for a schema assertion", async () => {
    const res = await request(app).get('/mcp/schema').set(MCP_ASSERTION_HEADER, assertion({ purpose: 'schema' }));
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.sdl).toBe(liteSdl());
    expect(res.body.sdl).toContain('type Query');
    expect(res.body.sdl).toContain('liteEvent(slug: String!): LiteEvent');
    expect(res.body.sdl).toContain('liteRegister(event_id: ID!, input: LiteRegisterInput!): LiteRegistration!');
  });
});

describe('mcpScopePlugin', () => {
  const server = new ApolloServer<LiteContext>({
    typeDefs: 'type Query { ping: String } type Mutation { touch: Boolean }',
    resolvers: { Query: { ping: () => 'pong' }, Mutation: { touch: () => true } },
    plugins: [mcpScopePlugin],
  });

  afterAll(async () => {
    await server.stop();
  });

  const contextFor = (scope?: McpScope): LiteContext => ({
    req: Object.create(express.request),
    res: Object.create(express.response),
    user: null,
    ...(scope ? { mcp: { scope } } : {}),
  });

  async function run(query: string, scope?: McpScope) {
    const response = await server.executeOperation({ query }, { contextValue: contextFor(scope) });
    if (response.body.kind !== 'single') throw new Error('expected a single result');
    return response.body.singleResult;
  }

  it('refuses a mutation on a read-only MCP connection', async () => {
    const result = await run('mutation { touch }', 'read');
    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      message: 'This MCP connection is read-only. Reconnect with read & write access to change anything',
      extensions: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
  });

  it('lets a read-only connection query', async () => {
    const result = await run('{ ping }', 'read');
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ ping: 'pong' });
  });

  it('lets a write connection and an ordinary session change things', async () => {
    expect((await run('mutation { touch }', 'write')).data).toEqual({ touch: true });
    expect((await run('mutation { touch }')).data).toEqual({ touch: true });
  });
});
