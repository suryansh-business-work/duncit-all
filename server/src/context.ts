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
  return { req, res, user };
}
