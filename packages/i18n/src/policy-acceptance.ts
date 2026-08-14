import type { TranslateOptions } from './translator';

/**
 * How an acceptance was given, in the reader's language.
 *
 * Every key is written out as a literal `t('…')` call rather than composed from
 * a namespace and the method the server sent. Two reasons, and both matter:
 *  - `scripts/verify-translation-keys.mjs` greps source for the literal key, so
 *    a computed key is reported as shipped-but-never-rendered and fails the
 *    Shared Gates job;
 *  - a typo in a computed key fails silently at runtime as the key itself
 *    printed on screen, while a literal one is greppable.
 *
 * It lives here rather than in the Legal portal because the method is a SERVER
 * value — the register resolver decides whether an acceptance came from the
 * signup form, from Google or from a later visit — and the portal must not hold
 * its own translation of somebody else's enum.
 *
 * The type mirrors `mail-preference.ts` rather than importing from it: both are
 * structural one-liners, and neither module should have to depend on the other
 * to name the `t` its caller already has.
 */

/** The `t` any surface hands in. Structural, so no surface owns this module. */
export type PolicyMethodTranslate = (key: string, options?: TranslateOptions) => string;

const LABELS: Record<string, (t: PolicyMethodTranslate) => string> = {
  SIGNUP_FORM: (t) => t('legalAcceptanceLogs.methods.signupForm'),
  GOOGLE_SIGNUP: (t) => t('legalAcceptanceLogs.methods.googleSignup'),
  // The server's third method is spelled ACCOUNT — accepted from inside an
  // account that already existed. LATER stays beside it because the copy is
  // written from the reader's side ("Accepted later"), and an audit row must
  // never fall through to a raw enum for a method that ships today.
  ACCOUNT: (t) => t('legalAcceptanceLogs.methods.later'),
  LATER: (t) => t('legalAcceptanceLogs.methods.later'),
};

/**
 * What one acceptance method is called.
 *
 * A method this bundle has no copy for yet is a server that wired a fourth way
 * to accept ahead of a client release. It renders under its own value rather
 * than as a raw `legalAcceptanceLogs.methods.x` key — the row still reads, and
 * an auditor can still see that the acceptance happened.
 */
export function policyAcceptanceMethodLabel(t: PolicyMethodTranslate, method: string): string {
  const known = LABELS[method];
  if (known) return known(t);
  return method;
}
