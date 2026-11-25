/**
 * What a console session token says about Security Verification (the `psv`
 * claim the server mints at a console sign-in).
 *
 * READ FOR THE SCREEN ONLY. The token is signed, and this reads it without
 * checking the signature (a client cannot), so it decides what to SHOW — never
 * what is allowed. The server refuses a token that has not completed the screen
 * on every request, whatever this says.
 *
 * Framework-free so every console reads it the same way: the portals (through
 * @duncit/shell) and the Duncit CRM app.
 */
export interface PortalSessionClaim {
  portal: string;
  verified: boolean;
  policy?: string;
}

/** The claim is plain ASCII (a console key, a flag, a version), so no UTF-8 decoding is needed. */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replaceAll('-', '+').replaceAll('_', '/');
  return atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
}

/** The `psv` claim of a token, or null for a token without one (or one that is not a JWT). */
export function readSessionClaim(token: string | null | undefined): PortalSessionClaim | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const psv = (JSON.parse(decodeBase64Url(payload)) as { psv?: Partial<PortalSessionClaim> }).psv;
    if (!psv || typeof psv.portal !== 'string' || typeof psv.verified !== 'boolean') return null;
    return { portal: psv.portal, verified: psv.verified, policy: typeof psv.policy === 'string' ? psv.policy : undefined };
  } catch {
    return null;
  }
}

/** True for a console sign-in that has not completed the screen. */
export const isPortalTokenPending = (token: string | null | undefined): boolean => readSessionClaim(token)?.verified === false;

/** True for a token the screen has been completed for — the one that may need it again after a policy change. */
export const isPortalTokenVerified = (token: string | null | undefined): boolean => readSessionClaim(token)?.verified === true;
