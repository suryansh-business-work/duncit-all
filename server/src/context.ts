import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { watchClientPresence } from '@utils/clientPresence';

export interface AuthUser {
  id: string;
  email?: string | null;
  roles: string[];
  assigned_city?: string | null;
  assigned_zones?: string[];
}

export interface GraphQLContext {
  req: Request;
  res: Response;
  user: AuthUser | null;
  device_id: string | null;
  /**
   * `x-no-redis: true` — the client asked to skip the Redis response cache
   * (portals/mWeb send it when the URL carried `?noRedis=true`). Read by the
   * redisResponseCache plugin; resolvers never need to look at it.
   */
  noRedis: boolean;
  /**
   * True once the caller has hung up mid-request — the app's own timeout fired,
   * or the tab was closed. Expensive reads check it and abandon the request
   * rather than finishing work for a socket that is already gone.
   */
  isClientGone: () => boolean;
}

/**
 * The verified account behind an `Authorization: Bearer …` header, or null.
 *
 * Exported because the log ingest needs the same answer the GraphQL context
 * reaches: two decoders would be two places for the secret fallback below to
 * drift, and a log attributed to nobody while the query beside it is
 * authenticated reads as a bug in the telemetry rather than in the header.
 */
export function decodeAuthUser(authorization?: string | null): AuthUser | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    // Fallback MUST match `signToken` (user.service.ts). If they diverge, a
    // server started without JWT_SECRET signs with one secret and verifies
    // with another — silently rejecting every token (me -> null for all).
    return jwt.verify(authorization.slice(7), process.env.JWT_SECRET || 'dev-secret') as AuthUser;
  } catch {
    return null;
  }
}

export async function buildContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  const user: AuthUser | null = decodeAuthUser(req.headers.authorization);
  const rawDuid = req.headers['x-duid'];
  const duidFromArray =
    Array.isArray(rawDuid) && rawDuid[0]
      ? String(rawDuid[0]).trim().slice(0, 100)
      : null;
  const device_id =
    typeof rawDuid === 'string' && rawDuid.trim()
      ? rawDuid.trim().slice(0, 100)
      : duidFromArray;
  const rawNoRedis = req.headers['x-no-redis'];
  const noRedis = (Array.isArray(rawNoRedis) ? rawNoRedis[0] : rawNoRedis) === 'true';
  return { req, res, user, device_id, noRedis, isClientGone: watchClientPresence(res) };
}
