import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { decodeAuthUser } from '../context';

/**
 * Who is behind the request currently being handled.
 *
 * `logs.server.error(...)` is called from four hundred places, none of which
 * hold the request — so a bug raised by a resolver would land in the Tech
 * portal attributed to nobody while the browser sitting behind it is exactly
 * what makes the bug reproducible. Threading a caller argument through every
 * one of those call sites is four hundred chances to forget it; an
 * AsyncLocalStorage entered once per request carries it instead.
 *
 * Everything here is READ FROM THE REQUEST, never from a body: the account
 * comes from the verified JWT, the address from the proxy chain Express
 * already trusts. A client cannot claim to be someone else.
 */

export interface LogIdentityUser {
  id: string;
  email?: string;
  roles?: string[];
}

export interface RequestIdentity {
  user?: LogIdentityUser;
  ip?: string;
  user_agent?: string;
  duid?: string;
}

const store = new AsyncLocalStorage<RequestIdentity>();

/** First header value when a proxy sent several, trimmed and length-capped. */
function headerValue(raw: string | string[] | undefined, max = 400): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value = typeof first === 'string' ? first.trim() : '';
  return value ? value.slice(0, max) : undefined;
}

/** The identity a request carries, with nothing taken on trust from its body. */
export function identityFromRequest(req: Request): RequestIdentity {
  const user = decodeAuthUser(req.headers.authorization);
  return {
    user: user ? { id: user.id, email: user.email ?? undefined, roles: user.roles } : undefined,
    // `trust proxy` is on, so req.ip is already the client rather than nginx.
    ip: typeof req.ip === 'string' && req.ip ? req.ip.slice(0, 60) : undefined,
    user_agent: headerValue(req.headers['user-agent']),
    duid: headerValue(req.headers['x-duid'], 100),
  };
}

export const requestIdentity = {
  /** The identity of the request in flight, or undefined outside one (jobs, boot). */
  current(): RequestIdentity | undefined {
    return store.getStore();
  },
  run<T>(identity: RequestIdentity, fn: () => T): T {
    return store.run(identity, fn);
  },
};

/**
 * Enter the store for every inbound request. Mounted once, before any route:
 * a per-route version would silently miss whichever route was added next.
 */
export function requestIdentityMiddleware(req: Request, _res: Response, next: NextFunction): void {
  requestIdentity.run(identityFromRequest(req), next);
}
