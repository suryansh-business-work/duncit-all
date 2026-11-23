import { onError } from '@apollo/client/link/error';
import { PORTAL_SECURITY_RECHECK_EVENT, isPortalTokenVerified } from './sessionClaim';

/** A refused request is looked into at most this often, so a page full of failing queries asks once. */
const MIN_GAP_MS = 15_000;

interface CodedErrors {
  errors?: ReadonlyArray<{ extensions?: { code?: unknown } }>;
}

/**
 * Notices the one failure that means "the terms changed under this session".
 *
 * A token that completed Security Verification stops being a session on the
 * server the moment the policy it consented to is replaced — and from the page
 * that simply reads as every request coming back signed-out. When that happens
 * to a token that WAS verified, the gate is told to ask the server whether the
 * screen is owed again, instead of leaving the console half-working.
 */
export function createPortalSecurityRecheckLink(getToken: () => string | null) {
  let lastSignalAt = 0;
  return onError(({ error, operation }) => {
    // The check itself is refused for a dead token too; asking again would never end.
    if (operation?.operationName === 'PortalSecurityChallenge') return;
    const refused = (error as CodedErrors | undefined)?.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
    if (!refused || !isPortalTokenVerified(getToken())) return;
    const now = Date.now();
    if (now - lastSignalAt < MIN_GAP_MS) return;
    lastSignalAt = now;
    globalThis.window.dispatchEvent(new Event(PORTAL_SECURITY_RECHECK_EVENT));
  });
}
