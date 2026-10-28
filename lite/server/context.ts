import type { Request, Response } from 'express';
import { MCP_ASSERTION_HEADER, verifyMcpAssertion, type McpScope } from './mcp/assertion';
import { LiteUserModel, type LiteUserDoc } from './models/user.model';
import { authService } from './services/auth.service';
import { forbidden, unauthenticated } from './utils/errors';
import { decodeAuthUser, type AuthUser } from './utils/token';

export { decodeAuthUser, signToken, type AuthUser, type TokenClaims } from './utils/token';

export interface LiteContext {
  req: Request;
  res: Response;
  user: AuthUser | null;
  /** Set when the call came through the MCP connector, with the connection's scope. */
  mcp?: { scope: McpScope };
}

/**
 * The person behind a request: a session token, or — for a call through
 * mcp.duncit.com — a signed MCP assertion, whose email finds (or makes) the
 * Lite account exactly as signing in with that email would.
 */
export async function buildContext({ req, res }: { req: Request; res: Response }): Promise<LiteContext> {
  const assertion = verifyMcpAssertion(req.headers[MCP_ASSERTION_HEADER]);
  if (assertion?.purpose === 'call' && assertion.email) {
    const account = await authService.accountForEmail(assertion.email, assertion.name, assertion.duncit_user_id);
    return { req, res, user: { id: String(account._id), email: account.email ?? '', is_admin: account.is_admin }, mcp: { scope: assertion.scope } };
  }
  return { req, res, user: decodeAuthUser(req.headers.authorization) };
}

/** The signed-in account, loaded fresh so a block or an admin change applies at once. */
export async function requireUser(ctx: LiteContext): Promise<LiteUserDoc> {
  if (!ctx.user) throw unauthenticated();
  const user = await LiteUserModel.findById(ctx.user.id);
  if (!user) throw unauthenticated('Your session has ended. Please sign in again');
  if (user.is_blocked) throw forbidden('This account has been blocked');
  return user;
}

export async function requireAdmin(ctx: LiteContext): Promise<LiteUserDoc> {
  const user = await requireUser(ctx);
  if (!user.is_admin) throw forbidden('Only a Lite admin can do this');
  return user;
}

export async function optionalUser(ctx: LiteContext): Promise<LiteUserDoc | null> {
  if (!ctx.user) return null;
  const user = await LiteUserModel.findById(ctx.user.id);
  return user && !user.is_blocked ? user : null;
}
