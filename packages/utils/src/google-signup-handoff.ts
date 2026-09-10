/**
 * "Google knows you, Duncit does not — shall we make you an account?"
 *
 * `loginWithGoogle` answers GOOGLE_ACCOUNT_NOT_FOUND for a verified Google
 * account no Duncit account is linked to. That used to be a dead end dressed up
 * as a notice: the credential was thrown away and the person was dropped on the
 * signup screen to press the same Google button a second time. What travels
 * here instead is the credential ITSELF, unspent, so the invite's "yes" lands
 * on the Google signup steps already holding what Google returned.
 *
 * The whole file exists because that credential must be spent AT MOST ONCE.
 * Every way a person can hit this flow twice — a second tap while the first
 * exchange is still in the air, a double press on the invite, a screen that
 * remounts and re-reads the same navigation params — has to collapse to one
 * signup, or two accounts get made for one Google identity. The server's unique
 * index on `auth.google_id` is the last line of that defence; this is the first,
 * and it is the one that keeps the person from ever seeing the collision.
 *
 * Framework-free on purpose (rule 40): mWeb carries the handoff in router
 * state, the native app in a navigation param, and both get identical
 * at-most-once semantics from the same three functions rather than from two
 * hand-written guards that would drift on exactly the part that matters.
 */

/** The credential a refused Google sign-in carries into signup. */
export interface GoogleSignupHandoff {
  /**
   * The id_token `loginWithGoogle` just refused, still unspent.
   *
   * Re-used rather than re-fetched: Google id tokens stay valid for an hour,
   * far longer than reading a dialog takes, and a second round trip to Google
   * would be a second chance to end up with two of them in flight.
   */
  idToken: string;
  /**
   * The address Google verified, so the invite can name the account it is
   * offering to create. Echoed back by the server from the token the caller
   * just supplied, so it discloses nothing they did not already hold.
   */
  email: string;
}

/**
 * Open — or keep — the invite for this credential.
 *
 * Idempotent in the token: a second credential that is the SAME one returns the
 * handoff already open, unchanged and referentially equal, so a double tap
 * cannot stack two invites or swap the credential under an open one. A
 * genuinely different token replaces it, because that is a different person
 * signing in.
 */
export function openGoogleSignup(
  current: GoogleSignupHandoff | null,
  idToken: string,
  email: string,
): GoogleSignupHandoff {
  if (current && current.idToken === idToken) return current;
  return { idToken, email };
}

/**
 * Read a handoff back off whatever the surface's navigation carried.
 *
 * Deliberately strict: router state survives a reload and a navigation param
 * survives a remount, so this is reading untrusted, possibly stale shape. Only
 * a complete, non-blank pair is a handoff — anything else is signup opened
 * normally, which is the safe reading of a malformed one.
 */
export function readGoogleSignupHandoff(carried: unknown): GoogleSignupHandoff | null {
  if (!carried || typeof carried !== 'object') return null;
  const { idToken, email } = carried as Partial<GoogleSignupHandoff>;
  if (typeof idToken !== 'string' || !idToken.trim()) return null;
  if (typeof email !== 'string') return null;
  return { idToken, email };
}

/**
 * Which credential a surface has already carried into signup.
 *
 * ONE slot, not a ledger: a person can only be part-way through one sign-in at
 * a time, so remembering the last one is all it takes to tell a re-read from a
 * new attempt — and it cannot grow.
 *
 * Handed in rather than hidden in this module, because it has to outlive the
 * screen. React state and refs die with the mount, and the whole point is to
 * still know on the SECOND mount; a surface keeps one of these at module scope
 * for that. Passing it also keeps the claim honest to test and to demonstrate —
 * a fresh ledger is a fresh run, which a hidden one could never be.
 *
 * That it dies with the JS context is deliberate too: a full page reload really
 * should carry the credential into signup again rather than lose it.
 */
export interface GoogleSignupClaims {
  /** The credential most recently claimed, or null before the first. */
  last: string | null;
}

/** A ledger that has claimed nothing yet. */
export function createGoogleSignupClaims(): GoogleSignupClaims {
  return { last: null };
}

/**
 * Claim a handoff. Single use.
 *
 * The first call for a credential hands it over; every call after it for that
 * SAME credential answers null. This is what lets a remount, a back-and-
 * forward, or a reload of the signup screen re-read the same navigation param
 * without starting the Google signup steps a second time on top of the ones
 * already running.
 *
 * A different credential claims freshly — signing in again as somebody else is
 * a new attempt, not a replay of the old one.
 */
export function claimGoogleSignupHandoff(
  claims: GoogleSignupClaims,
  handoff: GoogleSignupHandoff | null,
): GoogleSignupHandoff | null {
  if (!handoff || handoff.idToken === claims.last) return null;
  claims.last = handoff.idToken;
  return handoff;
}
