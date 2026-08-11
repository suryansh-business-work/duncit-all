import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

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
}

export async function buildContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  let user: AuthUser | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      // Fallback MUST match `signToken` (user.service.ts). If they diverge, a
      // server started without JWT_SECRET signs with one secret and verifies
      // with another — silently rejecting every token (me -> null for all).
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthUser;
      user = decoded;
    } catch {
      user = null;
    }
  }
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
  return { req, res, user, device_id, noRedis };
}
