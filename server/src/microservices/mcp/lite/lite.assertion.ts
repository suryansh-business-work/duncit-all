import jwt from 'jsonwebtoken';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * The one-minute statement the "lite" connector signs for each call to Duncit
 * Lite: "this request is from <the Duncit account's email>, with a read (or
 * read & write) connection". Lite verifies it with the same shared secret and
 * acts as the Lite account for that email — the same proof "Sign in with
 * Duncit" gives it — so the two systems share no database and no long-lived
 * credential travels on the wire.
 *
 * The claim names are kept in step with lite/server/mcp/assertion.ts.
 */
export const LITE_ASSERTION_HEADER = 'x-lite-mcp-assertion';
const ISSUER = 'mcp.duncit.com';
const AUDIENCE = 'lite.duncit.com';
const LIFETIME_SECONDS = 60;

export type LiteScope = 'read' | 'write';

export interface LiteCaller {
  email: string;
  name?: string | null;
  duncitUserId: string;
  scope: LiteScope;
}

/** The shared secret, or null — the connector stays off until both sides have it. */
export async function liteSecret(): Promise<string | null> {
  const secret = (await getRuntimeEnvValue('LITE_MCP_SECRET'))?.trim();
  return secret || null;
}

/** An assertion for one tool call as `caller`. */
export function signCallAssertion(secret: string, caller: LiteCaller): string {
  return jwt.sign(
    { purpose: 'call', email: caller.email, name: caller.name ?? undefined, duncit_user_id: caller.duncitUserId, scope: caller.scope },
    secret,
    { algorithm: 'HS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: LIFETIME_SECONDS }
  );
}

/** An assertion that only reads Lite's schema (no person). */
export function signSchemaAssertion(secret: string): string {
  return jwt.sign({ purpose: 'schema', scope: 'read' }, secret, { algorithm: 'HS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: LIFETIME_SECONDS });
}
