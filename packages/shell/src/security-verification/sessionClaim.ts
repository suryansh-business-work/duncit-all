/**
 * What the console's session token says about Security Verification.
 *
 * The reader itself lives in @duncit/user-core (framework-free), so the
 * portals and the Duncit CRM app decode the `psv` claim with one function;
 * it is re-exported here under the names the shell has always used.
 */
export {
  isPortalTokenPending,
  isPortalTokenVerified,
  readSessionClaim,
  type PortalSessionClaim,
} from '@duncit/user-core';

/** Fired when a request is refused as signed-out while the token says it was verified. */
export const PORTAL_SECURITY_RECHECK_EVENT = 'duncit:portal-security-recheck';
