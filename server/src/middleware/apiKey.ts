import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { apiKeyService } from '@modules/platform/apiKey/apiKey.service';
import { evaluate } from '@modules/platform/rateLimit/rateLimit.enforcer';
import { describeRequest } from '@modules/platform/rateLimit/rateLimit.guard';
import { logs } from '@observability/log';

export interface ApiKeyAuth {
  id: string;
  owner_user_id: string;
  scopes: string[];
}

/** Request shape after requireApiKey has attached the verified key. */
export interface ApiKeyedRequest extends Request {
  apiKey?: ApiKeyAuth;
}

/**
 * Authenticates a public-API request via the `x-api-key` header. Rejects with
 * 401 (unknown/revoked key), 403 (key lacks a required scope) or 429 (rate
 * limited), otherwise attaches `req.apiKey` and continues.
 *
 * The 429 is decided by the platform limiter (Tech > Rate Limiting), keyed on
 * API_KEY — not by a window written here. This file used to carry its own
 * 120-per-minute map, which meant the one limit an integrator ever asked about
 * was the one nobody could change without a deploy, and it counted separately
 * from every other ceiling. The shipped "Public API keys" rule is that same
 * 120/60s, now editable.
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
      // Asked HERE rather than by the global middleware because the key's id
      // is what an API_KEY rule counts per, and it does not exist until the
      // line above has verified it.
      const { request, info } = describeRequest(req, 'REST');
      const decision = await evaluate({ ...request, apiKeyId: String(doc._id) }, info);
      if (!decision.allowed) {
        if (decision.retry_after) res.set('Retry-After', String(decision.retry_after));
        return res.status(429).json({ error: 'rate_limited', message: decision.message });
      }
      (req as ApiKeyedRequest).apiKey = {
        id: String(doc._id),
        owner_user_id: String(doc.owner_user_id),
        scopes,
      };
      return next();
    } catch (err) {
      logs.server.error('apiKey', 'requireApiKey', {
        error: err,
        msg: 'verification failed',
      });
      return res.status(401).json({ error: 'invalid_api_key' });
    }
  };
}
