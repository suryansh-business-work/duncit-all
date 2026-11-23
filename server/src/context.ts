import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { watchClientPresence } from '@utils/clientPresence';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { isSessionSealed } from '@modules/access/auth/session-seal';
import { effectiveRoles } from '@modules/access/auth/current-roles';
import { consentFromRequest, type TrackingConsent } from '@utils/consent';
import { platformFromRequest, trackUserActivity } from '@modules/access/user/user.activity';
import {
  isPortalSessionPending,
  type PortalSessionClaim,
} from '@modules/portals/portalSecurity/portalSecurity.claims';

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
  /**
   * A console sign-in that has not yet completed the Security Verification
   * screen (or owes it again after a policy change). It is NOT a session:
   * `user` stays null for it, so every resolver reads it as signed out. Only the
   * verification operations read this, to know whose screen it is.
   */
  portalSecurity?: PendingPortalSession | null;
  device_id: string | null;
  /**
   * What the caller allowed us to store (`x-consent`, see utils/consent.ts).
   * Optional data — usage analytics, campaign attribution — is written only
   * when the matching category is true.
   */
  consent: TrackingConsent;
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
  /**
   * Set only for an operation the server runs on someone's behalf
   * (utils/execute-as-user): which system the rate limiter counts it under,
   * since the HTTP request it rides on belongs to the integration.
   */
  client?: CallerClient;
}

/** A rate-limit system label: a RATE_LIMIT_SURFACES value and an app key. */
export interface CallerClient {
  surface: string;
  app: string;
}

/** Who a not-yet-verified console token belongs to, and which console it is for. */
export interface PendingPortalSession {
  userId: string;
  /** The console's `appConfig.key`, read from the signed token. */
  portal: string;
  /** True when the person did verify once, but the policy has changed since. */
  reverify: boolean;
  /** The token's issue time in seconds — a re-verification is never older than it. */
  issuedAt?: number;
}

type SessionClaims = AuthUser & { iat?: number; psv?: PortalSessionClaim };

/**
 * The verified account behind an `Authorization: Bearer …` header, or null.
 *
 * Exported because the log ingest needs the same answer the GraphQL context
 * reaches: two decoders would be two places for the secret fallback below to
 * drift, and a log attributed to nobody while the query beside it is
 * authenticated reads as a bug in the telemetry rather than in the header.
 */
export function decodeAuthUser(authorization?: string | null): AuthUser | null {
  const claims = verifySession(authorization);
  // A console sign-in that still owes the Security Verification screen is not a
  // session: refusing it HERE is what keeps it out of every resolver, the
  // notification stream, the voice route and the rate limiter at once.
  return claims && !isPortalSessionPending(claims) ? claims : null;
}

/**
 * The console sign-in behind a header that has NOT completed Security
 * Verification — or null for a verified session, a legacy token and a bad one.
 * Read only by the verification operations.
 */
export function decodePendingPortalSession(authorization?: string | null): PendingPortalSession | null {
  const claims = verifySession(authorization);
  if (!claims?.psv || !isPortalSessionPending(claims)) return null;
  return {
    userId: claims.id,
    portal: claims.psv.portal,
    reverify: claims.psv.verified === true,
    issuedAt: claims.iat,
  };
}

function verifySession(authorization?: string | null): SessionClaims | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    // Fallback MUST match `signToken` (user.service.ts). If they diverge, a
    // server started without JWT_SECRET signs with one secret and verifies
    // with another — silently rejecting every token (me -> null for all).
    const user = jwt.verify(
      authorization.slice(7),
      process.env.JWT_SECRET || 'dev-secret'
    ) as SessionClaims;
    /*
      A valid signature is no longer the whole answer.

      Duncit JWTs never expire, so an account whose owner has asked for it to be
      deleted would otherwise go on being usable from every device it was ever
      signed in on for the length of the grace period. Refusing it HERE — rather
      than in each of the several hundred resolvers — is what makes "your
      sessions have ended" true of the phone left on a table as well as of the
      browser the request was filed from. The caller reads as signed out, which
      is exactly what they are.
    */
    if (isAccountLocked(user?.id)) return null;
    /*
      And a token older than the account's last password reset is refused for
      the same reason, one step narrower: the account is fine, this SESSION is
      not. Recovering a forgotten password is the one flow whose premise is that
      somebody else may hold the old credentials, so the browser they left
      signed in has to stop working the moment the real owner finishes.
    */
    if (isSessionSealed(user?.id, user?.iat)) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * {@link decodeAuthUser}, with the roles cut down to the ones the account
 * still holds (see `current-roles.ts`).
 *
 * Separate from the decode because the decode is synchronous and answers
 * "who is this" for the log ingest, the rate limiter and the notification
 * stream, none of which open a door on a role. The GraphQL context is where
 * roles open doors, so it is where a revoked one has to stop working: on the
 * very next request, without signing the person out.
 */
export async function resolveAuthUser(authorization?: string | null): Promise<AuthUser | null> {
  const user = decodeAuthUser(authorization);
  if (!user) return null;
  return { ...user, roles: await effectiveRoles(user.id, user.roles ?? []) };
}

export async function buildContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  const user: AuthUser | null = await resolveAuthUser(req.headers.authorization);
  // Null for a signed-out caller and for a verified session alike; set only for
  // a console token that owes the Security Verification screen.
  const portalSecurity = user ? null : decodePendingPortalSession(req.headers.authorization);
  // Admin > Users "Last Activity" and "Platforms Used": throttled and never awaited.
  if (user) trackUserActivity(user.id, platformFromRequest(req));
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
  return {
    req,
    res,
    user,
    portalSecurity,
    device_id,
    consent: consentFromRequest(req),
    noRedis,
    isClientGone: watchClientPresence(res),
  };
}
