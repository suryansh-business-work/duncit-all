import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface TokenClaims {
  sub: string;
  email: string;
  admin: boolean;
}

export function signToken(user: { _id: unknown; email?: string | null; is_admin: boolean }): string {
  const claims: TokenClaims = { sub: String(user._id), email: user.email ?? '', admin: user.is_admin };
  return jwt.sign(claims, env.jwtSecret, { expiresIn: '90d' });
}

/** The verified account behind a session token, or null. */
export function decodeToken(token: string | null | undefined): AuthUser | null {
  if (!token) return null;
  try {
    const claims = jwt.verify(token, env.jwtSecret) as TokenClaims;
    return { id: claims.sub, email: claims.email, is_admin: Boolean(claims.admin) };
  } catch {
    return null;
  }
}

/** The verified account behind an `Authorization: Bearer …` header, or null. */
export function decodeAuthUser(authorization?: string | null): AuthUser | null {
  return authorization?.startsWith('Bearer ') ? decodeToken(authorization.slice(7)) : null;
}
