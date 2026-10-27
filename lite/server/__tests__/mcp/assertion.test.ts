import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { MCP_ASSERTION_HEADER, MCP_AUDIENCE, MCP_ISSUER, verifyMcpAssertion } from '../../mcp/assertion';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, mcpSecret: 'mcp-shared-secret' } };
});

const SECRET = 'mcp-shared-secret';

/** An assertion as mcp.duncit.com signs it; options and the secret can be overridden per case. */
const sign = (claims: Record<string, unknown>, options: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign(claims, secret, { algorithm: 'HS256', issuer: MCP_ISSUER, audience: MCP_AUDIENCE, expiresIn: 60, ...options });

afterEach(() => {
  Object.assign(env, { mcpSecret: SECRET });
});

describe('MCP assertion constants', () => {
  it('match what mcp.duncit.com signs', () => {
    expect(MCP_ASSERTION_HEADER).toBe('x-lite-mcp-assertion');
    expect(MCP_ISSUER).toBe('mcp.duncit.com');
    expect(MCP_AUDIENCE).toBe('lite.duncit.com');
  });
});

describe('verifyMcpAssertion', () => {
  it('accepts a call for a person with write scope', () => {
    const header = sign({ purpose: 'call', email: 'priya@duncit.com', name: 'Priya', duncit_user_id: 'dun-42', scope: 'write' });
    expect(verifyMcpAssertion(header)).toEqual({ purpose: 'call', email: 'priya@duncit.com', name: 'Priya', duncit_user_id: 'dun-42', scope: 'write' });
  });

  it('defaults the scope to read and the purpose to call', () => {
    expect(verifyMcpAssertion(sign({ email: 'priya@duncit.com' }))).toEqual({ purpose: 'call', email: 'priya@duncit.com', name: undefined, duncit_user_id: undefined, scope: 'read' });
    expect(verifyMcpAssertion(sign({ email: 'priya@duncit.com', scope: 'admin' }))?.scope).toBe('read');
  });

  it('accepts a schema read without a person', () => {
    expect(verifyMcpAssertion(sign({ purpose: 'schema' }))).toEqual({ purpose: 'schema', email: undefined, name: undefined, duncit_user_id: undefined, scope: 'read' });
  });

  it('refuses a call that names nobody', () => {
    expect(verifyMcpAssertion(sign({ purpose: 'call' }))).toBeNull();
    expect(verifyMcpAssertion(sign({ purpose: 'call', email: 42 }))).toBeNull();
  });

  it('drops a name or Duncit id that is not text', () => {
    expect(verifyMcpAssertion(sign({ email: 'priya@duncit.com', name: { first: 'Priya' }, duncit_user_id: 42 }))).toMatchObject({ name: undefined, duncit_user_id: undefined });
  });

  it('refuses an expired assertion, and one older than two minutes even if it claims longer', () => {
    expect(verifyMcpAssertion(sign({ email: 'priya@duncit.com' }, { expiresIn: -5 }))).toBeNull();
    const issuedLongAgo = Math.floor(Date.now() / 1000) - 300;
    expect(verifyMcpAssertion(sign({ email: 'priya@duncit.com', iat: issuedLongAgo }, { expiresIn: 3600 }))).toBeNull();
  });

  it('refuses the wrong audience, issuer, secret or algorithm', () => {
    const claims = { email: 'priya@duncit.com' };
    expect(verifyMcpAssertion(sign(claims, { audience: 'duncit.com' }))).toBeNull();
    expect(verifyMcpAssertion(sign(claims, { issuer: 'evil.example' }))).toBeNull();
    expect(verifyMcpAssertion(sign(claims, {}, 'another-secret'))).toBeNull();
    expect(verifyMcpAssertion(sign(claims, { algorithm: 'HS512' }))).toBeNull();
  });

  it('refuses everything while the connector is switched off', () => {
    const header = sign({ email: 'priya@duncit.com', scope: 'write' });
    Object.assign(env, { mcpSecret: '' });
    expect(verifyMcpAssertion(header)).toBeNull();
  });

  it('refuses a header that is missing, empty, repeated or not a token', () => {
    const header = sign({ email: 'priya@duncit.com' });
    expect(verifyMcpAssertion(undefined)).toBeNull();
    expect(verifyMcpAssertion('')).toBeNull();
    expect(verifyMcpAssertion([header, header])).toBeNull();
    expect(verifyMcpAssertion('not-a-jwt')).toBeNull();
  });
});
