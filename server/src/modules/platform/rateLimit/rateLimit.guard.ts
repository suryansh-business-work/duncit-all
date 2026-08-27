import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { GraphQLError, Kind, type FieldNode } from 'graphql';
import { HeaderMap, type ApolloServerPlugin } from '@apollo/server';
import { logs } from '@observability/log';
import { decodeAuthUser, type GraphQLContext } from '@context';
import { evaluate, type RateLimitContextInfo } from './rateLimit.enforcer';
import { normaliseApp, normaliseSurface } from './rateLimit.match';
import type { RateLimitChannel, RateLimitDecision, RateLimitRequest } from './rateLimit.types';

/**
 * The three doors into the API, each asking the same enforcer.
 *
 * They exist separately only because they know different things: the Apollo
 * plugin is the only one that can see which GraphQL fields a document selects,
 * the Express middleware is the only one that sees a REST path, and the socket
 * handshake has neither. What any of them DOES about the answer is identical,
 * which is why the answer is computed in one place.
 */

/** The header naming which Duncit app is calling — `tech`, `mweb`, `native`. */
export const APP_HEADER = 'x-duncit-app';

/** First header value when a proxy sent several. */
function header(req: Request, name: string): string | undefined {
  const raw = req.headers[name];
  const first = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === 'string' && first.trim() ? first.trim() : undefined;
}

/** Everything a rule can match on, read off the request and nothing else. */
export function describeRequest(
  req: Request,
  channel: RateLimitChannel,
): { request: RateLimitRequest; info: RateLimitContextInfo } {
  const user = decodeAuthUser(req.headers.authorization);
  const declared = header(req, 'x-duncit-surface');
  // An api-key caller is an integration whatever it says it is, and it is the
  // one surface the server can verify for itself.
  const surface = header(req, 'x-api-key') ? 'API' : normaliseSurface(declared);
  return {
    request: {
      channel,
      surface,
      app: surface === 'API' ? 'public-api' : normaliseApp(header(req, APP_HEADER)),
      path: req.path,
      method: req.method,
      // `trust proxy` is set on the app, so this is the client and not nginx.
      ip: typeof req.ip === 'string' ? req.ip : '',
      userId: user?.id,
      roles: user?.roles ?? [],
      deviceId: header(req, 'x-duid'),
    },
    info: {
      userAgent: header(req, 'user-agent'),
      userEmail: user?.email ?? undefined,
    },
  };
}

/** The X-RateLimit-* trio plus Retry-After, as a plain object. */
function limitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {};
  if (decision.limit !== undefined) headers['X-RateLimit-Limit'] = String(decision.limit);
  if (decision.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = String(decision.remaining);
  }
  if (decision.retry_after !== undefined) {
    headers['X-RateLimit-Reset'] = String(decision.retry_after);
    headers['Retry-After'] = String(decision.retry_after);
  }
  return headers;
}

/* ----------------------------- REST middleware ---------------------------- */

/**
 * Paths the limiter never touches.
 *
 * `/graphql` is governed by the plugin below, which knows which fields the
 * document selects — counting it here as well would spend two from every
 * ceiling for one request. `/health` and `/status` are what the monitoring
 * asks, and a limiter that can make the platform look down is worse than no
 * limiter at all.
 */
const SKIP_PREFIXES = ['/graphql', '/health', '/status'];

export const rateLimitMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix))) return next();
  const { request, info } = describeRequest(req, 'REST');
  evaluate(request, info)
    .then((decision) => {
      if (decision.allowed) return next();
      res.set(limitHeaders(decision));
      res.status(429).json({ error: 'rate_limited', message: decision.message });
    })
    .catch((err) => {
      // Never the reason a request fails: log it and let the caller through.
      logs.server.error('rateLimit', 'middleware', { error: err, path: req.path });
      next();
    });
};

/* ----------------------------- GraphQL plugin ----------------------------- */

/** The top-level fields a document selects, in the order it selects them. */
function selectedFields(selections: readonly unknown[]): string[] {
  return (selections as FieldNode[])
    .filter((s) => s.kind === Kind.FIELD)
    .map((s) => s.name.value)
    .filter((name) => !name.startsWith('__'));
}

function graphqlRefusal(decision: RateLimitDecision): GraphQLError {
  return new GraphQLError(decision.message ?? 'Too many requests.', {
    extensions: {
      code: 'RATE_LIMITED',
      rule: decision.rule_name,
      retry_after: decision.retry_after,
      http: { status: 429, headers: new HeaderMap(Object.entries(limitHeaders(decision))) },
    },
  });
}

/**
 * Evaluated at `didResolveOperation` — after the document has been parsed and
 * validated (so the field names are real) and before a single resolver runs
 * (so a refused request costs nothing but the parse).
 */
export const rateLimitPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didResolveOperation(ctx) {
        const operation = ctx.operation;
        if (!operation) return;
        const fields = selectedFields(operation.selectionSet.selections);
        // An introspection-only document has no product field to govern.
        if (fields.length === 0) return;
        const { request, info } = describeRequest(ctx.contextValue.req, 'GRAPHQL');
        const decision = await evaluate(
          {
            ...request,
            operation: fields[0],
            fields,
            operationType: operation.operation.toUpperCase() as 'QUERY' | 'MUTATION',
          },
          info,
        );
        if (!decision.allowed) throw graphqlRefusal(decision);
      },
    };
  },
};

/* ------------------------------ socket guard ------------------------------ */

/**
 * Whether a socket handshake may proceed.
 *
 * Sockets are long-lived, so what is being limited is how often one address may
 * OPEN one — a reconnect storm from a broken client, not the chat itself.
 */
export async function socketAllowed(handshake: {
  address: string;
  token?: string;
  surface?: string;
  app?: string;
  userAgent?: string;
}): Promise<RateLimitDecision> {
  const user = decodeAuthUser(handshake.token ? `Bearer ${handshake.token}` : undefined);
  return evaluate(
    {
      channel: 'SOCKET',
      surface: normaliseSurface(handshake.surface),
      app: normaliseApp(handshake.app),
      ip: handshake.address,
      userId: user?.id,
      roles: user?.roles ?? [],
    },
    { userAgent: handshake.userAgent, userEmail: user?.email ?? undefined },
  );
}
