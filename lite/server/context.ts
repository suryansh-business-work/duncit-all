import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { LiteUserModel, type LiteUserDoc } from './models/user.model';
import { forbidden, unauthenticated } from './utils/errors';

export interface AuthUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface LiteContext {
  req: Request;
  res: Response;
  user: AuthUser | null;
}

export interface TokenClaims {
  sub: string;
  email: string;
  admin: boolean;
}

export function signToken(user: { _id: unknown; email: string; is_admin: boolean }): string {
  const claims: TokenClaims = { sub: String(user._id), email: user.email, admin: user.is_admin };
  return jwt.sign(claims, env.jwtSecret, { expiresIn: '90d' });
}

/** The verified account behind an `Authorization: Bearer …` header, or null. */
export function decodeAuthUser(authorization?: string | null): AuthUser | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const claims = jwt.verify(authorization.slice(7), env.jwtSecret) as TokenClaims;
    return { id: claims.sub, email: claims.email, is_admin: Boolean(claims.admin) };
  } catch {
    return null;
  }
}

export async function buildContext({ req, res }: { req: Request; res: Response }): Promise<LiteContext> {
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
