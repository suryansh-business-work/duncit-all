import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * The MCP connector at mcp.duncit.com/lite/mcp calls Lite's own API as a
 * person, the same way "Sign in with Duncit" proves an email: mcp.duncit.com
 * has already authenticated the Duncit account (OAuth, roles, revocation), so
 * it signs a one-minute assertion naming that account's email. Lite verifies
 * the signature and acts as the Lite account for that email — no shared
 * database, no long-lived credential on the wire.
 *
 * Both sides keep the claim names in step: see
 * server/src/microservices/mcp/lite/assertion.ts in the main server.
 */
export const MCP_ASSERTION_HEADER = 'x-lite-mcp-assertion';
export const MCP_ISSUER = 'mcp.duncit.com';
export const MCP_AUDIENCE = 'lite.duncit.com';
/** The longest life an assertion may claim; anything older is refused even if signed. */
const MAX_AGE_SECONDS = 120;

export type McpScope = 'read' | 'write';
export type McpPurpose = 'call' | 'schema';

export interface McpAssertion {
  purpose: McpPurpose;
  /** The Duncit account's verified email; absent for a schema read. */
  email?: string;
  name?: string;
  duncit_user_id?: string;
  scope: McpScope;
}

/** The verified claims of an assertion header, or null (bad signature, expired, wrong audience, connector off). */
export function verifyMcpAssertion(header: unknown): McpAssertion | null {
  if (!env.mcpSecret || typeof header !== 'string' || header === '') return null;
  try {
    const claims = jwt.verify(header, env.mcpSecret, {
      algorithms: ['HS256'],
      issuer: MCP_ISSUER,
      audience: MCP_AUDIENCE,
      maxAge: MAX_AGE_SECONDS,
    }) as jwt.JwtPayload & Partial<McpAssertion>;
    const purpose = claims.purpose === 'schema' ? 'schema' : 'call';
    if (purpose === 'call' && typeof claims.email !== 'string') return null;
    return {
      purpose,
      email: claims.email,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      duncit_user_id: typeof claims.duncit_user_id === 'string' ? claims.duncit_user_id : undefined,
      scope: claims.scope === 'write' ? 'write' : 'read',
    };
  } catch {
    return null;
  }
}
