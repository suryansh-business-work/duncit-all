import { PORTAL_GATE_EXEMPT_KEYS } from '../portal.constants';

/**
 * The `psv` claim a console sign-in token carries.
 *
 * It is what makes the Security Verification screen a SERVER rule rather than a
 * page the client may skip: a console sign-in mints a token with
 * `verified: false`, and `isPortalSessionPending` makes every request that
 * carries it read as signed out — except the few operations the verification
 * itself needs, which read the pending session through `ctx.portalSecurity`.
 * Completing the screen swaps it for a token with `verified: true`.
 *
 * A token with no claim at all (mWeb, the native app, partners, a CI token, a
 * session minted before this shipped) is untouched: the screen is a console
 * sign-in step, and nothing in the partner product carries it.
 */
export interface PortalSessionClaim {
  /** The console the sign-in was for — its `appConfig.key`. */
  portal: string;
  /** False until the Security Verification screen has been completed. */
  verified: boolean;
  /** The policy version the person consented to. Verified tokens only. */
  policy?: string;
  /** When they consented, in seconds since the epoch. Verified tokens only. */
  at?: number;
}

/** The consent version currently in force, kept in memory (see `portalSecurity.policy`). */
let currentPolicyVersion: string | null = null;

export const setCurrentPolicyVersion = (version: string | null): void => {
  currentPolicyVersion = version;
};

const normalized = (portalKey: string | null | undefined): string => (portalKey ?? '').trim();

/**
 * Whether a console sign-in with this key goes through the verification screen.
 * Every console the portal gate knows does; the consumer and partner surfaces
 * (and a sign-in that names no console) never do.
 */
export function requiresPortalSecurity(portalKey: string | null | undefined): boolean {
  const key = normalized(portalKey);
  return key !== '' && !PORTAL_GATE_EXEMPT_KEYS.has(key);
}

/** The claim a fresh console sign-in is minted with, or undefined when it needs none. */
export function pendingClaimFor(portalKey: string | null | undefined): PortalSessionClaim | undefined {
  return requiresPortalSecurity(portalKey) ? { portal: normalized(portalKey), verified: false } : undefined;
}

/** The claim a completed verification is minted with. */
export function verifiedClaim(portal: string, policy: string, atMs: number = Date.now()): PortalSessionClaim {
  return { portal, verified: true, policy, at: Math.floor(atMs / 1000) };
}

const isClaim = (value: unknown): value is PortalSessionClaim =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PortalSessionClaim).portal === 'string' &&
  typeof (value as PortalSessionClaim).verified === 'boolean';

/**
 * Whether a token still owes the verification screen.
 *
 * Three ways to owe it: it was never completed; the claim is malformed (a shape
 * this server did not mint is not trusted); or the wording the person consented
 * to has since changed. The last is skipped while the current version is not
 * yet known (boot, or a database that could not be read) — a stale consent is
 * never a reason to lock everybody out of a console.
 */
export function isPortalSessionPending(claims: { psv?: unknown } | null | undefined): boolean {
  const psv = claims?.psv;
  if (psv === undefined || psv === null) return false;
  if (!isClaim(psv) || !psv.verified) return true;
  return currentPolicyVersion !== null && psv.policy !== currentPolicyVersion;
}
