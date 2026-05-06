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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as AuthUser;
      user = decoded;
    } catch {
      user = null;
    }
  }
  const rawDuid = req.headers['x-duid'];
  const device_id =
    typeof rawDuid === 'string' && rawDuid.trim()
      ? rawDuid.trim().slice(0, 100)
      : Array.isArray(rawDuid) && rawDuid[0]
        ? String(rawDuid[0]).trim().slice(0, 100)
        : null;
  return { req, res, user, device_id };
}
