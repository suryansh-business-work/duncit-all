import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { apiKeyService } from '@modules/platform/apiKey/apiKey.service';

export interface ApiKeyAuth {
  id: string;
  owner_user_id: string;
  scopes: string[];
}

/** Request shape after requireApiKey has attached the verified key. */
export interface ApiKeyedRequest extends Request {
  apiKey?: ApiKeyAuth;
}

// Tiny in-memory per-key limiter: sliding 60s window, 120 requests per key.
// Timestamps are pruned on access so the map never grows past active keys.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;
const rateUsage = new Map<string, number[]>();

function isRateLimited(keyId: string): boolean {
  const now = Date.now();
  const stamps = (rateUsage.get(keyId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (stamps.length >= RATE_MAX_REQUESTS) {
    rateUsage.set(keyId, stamps);
    return true;
  }
  stamps.push(now);
  rateUsage.set(keyId, stamps);
  return false;
}

/**
 * Authenticates a public-API request via the `x-api-key` header. Rejects with
 * 401 (unknown/revoked key), 403 (key lacks a required scope) or 429 (rate
 * limited), otherwise attaches `req.apiKey` and continues.
 */
export function requireApiKey(...requiredScopes: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = String(req.header('x-api-key') ?? '').trim();
      const doc = raw ? await apiKeyService.verify(raw) : null;
      if (!doc) {
        return res.status(401).json({ error: 'invalid_api_key' });
      }
      const scopes = doc.scopes ?? [];
      if (requiredScopes.some((s) => !scopes.includes(s))) {
        return res.status(403).json({ error: 'insufficient_scope' });
      }
      if (isRateLimited(String(doc._id))) {
        return res.status(429).json({ error: 'rate_limited' });
      }
      (req as ApiKeyedRequest).apiKey = {
        id: String(doc._id),
        owner_user_id: String(doc.owner_user_id),
        scopes,
      };
      return next();
    } catch (err) {
      console.error('[apiKey] verification failed:', err);
      return res.status(401).json({ error: 'invalid_api_key' });
    }
  };
}
