import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

/**
 * The half-finished sign-in between "the password was right" and "so was the
 * authenticator code".
 *
 * A short-lived signed token rather than a database row: it carries nothing the
 * account does not already say, and the attempt limit lives on the account
 * (two-factor.service), which is where a guesser holding a fresh challenge for
 * every try would still run into it.
 *
 * Signed with a key DERIVED from the session secret, never the session secret
 * itself: `decodeAuthUser` would otherwise accept a challenge as a session, and
 * the second factor would be the thing it was minted to skip.
 */

const PURPOSE = 'two_factor_login';
/** Long enough to unlock a phone and open the app, short enough to be useless later. */
export const CHALLENGE_TTL_SECONDS = 300;

const challengeSecret = () => `${process.env.JWT_SECRET || 'dev-secret'}:${PURPOSE}`;

/** Which door the first factor came through — replayed onto the account when the second passes. */
export type SignInProvider = 'EMAIL' | 'GOOGLE' | 'APPLE';

export interface TwoFactorChallenge {
  userId: string;
  provider: SignInProvider;
  /** The console being signed in to. Its role gate runs again on completion. */
  portalKey: string;
}

export function signChallenge(challenge: Readonly<TwoFactorChallenge>): string {
  return jwt.sign(
    { uid: challenge.userId, provider: challenge.provider, portal_key: challenge.portalKey, purpose: PURPOSE },
    challengeSecret(),
    { expiresIn: CHALLENGE_TTL_SECONDS }
  );
}

/** The challenge a token carries; a forged, stale or foreign one is the same refusal. */
export function verifyChallenge(token: string): TwoFactorChallenge {
  const expired = () =>
    new GraphQLError('This sign-in has expired. Sign in again.', {
      extensions: { code: 'TWO_FACTOR_CHALLENGE_EXPIRED' },
    });
  let decoded: { uid?: string; provider?: SignInProvider; portal_key?: string; purpose?: string };
  try {
    decoded = jwt.verify(String(token ?? ''), challengeSecret()) as typeof decoded;
  } catch {
    throw expired();
  }
  if (decoded.purpose !== PURPOSE || !decoded.uid || !decoded.provider) throw expired();
  return { userId: decoded.uid, provider: decoded.provider, portalKey: decoded.portal_key ?? '' };
}
