import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The identity an unsubscribe link carries.
 *
 * Somebody clicking "unsubscribe" in an email is not signed in and must not have
 * to be — an opt-out behind a login screen is an opt-out most people never
 * complete. So the link carries who it is for, and a signature proving we are
 * the ones who wrote it.
 *
 * Derived rather than stored: an HMAC of the address means a link can be put in
 * every email without a database write per recipient, and there is no token
 * table to leak, expire or clean up. The signing key is the server's existing
 * one (`JWT_SECRET`), the same key `user.service.ts` already hashes OTPs with —
 * rotating it invalidates old unsubscribe links, which is the correct behaviour
 * for a rotated key.
 *
 * The signature covers the address ALONE and not the category: the link opens a
 * screen, and the screen's mutations name the category. A token per category
 * would put nine links in every footer.
 */

const PURPOSE = 'mail-preference';

const signingKey = (): string => process.env.JWT_SECRET || 'dev-secret';

const normalise = (email: string): string => email.trim().toLowerCase();

/** The address as it travels in a URL. */
export const encodeMailPreferenceEmail = (email: string): string =>
  Buffer.from(normalise(email), 'utf8').toString('base64url');

const decodeEmail = (encoded: string): string => {
  try {
    return normalise(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return '';
  }
};

/** The signature for one address. */
export const mailPreferenceToken = (email: string): string =>
  createHmac('sha256', signingKey()).update(`${PURPOSE}:${normalise(email)}`).digest('base64url');

/**
 * The address a link is for, or null when the signature does not match.
 *
 * Compared in constant time. A guessable unsubscribe link is a way to switch off
 * somebody else's booking emails, so the check is treated as a credential check
 * even though nothing behind it is secret.
 */
export function verifyMailPreferenceToken(encodedEmail: string, token: string): string | null {
  const email = decodeEmail(encodedEmail);
  if (!email || !token) return null;

  const expected = Buffer.from(mailPreferenceToken(email), 'utf8');
  const supplied = Buffer.from(token, 'utf8');
  if (expected.length !== supplied.length) return null;
  return timingSafeEqual(expected, supplied) ? email : null;
}

/**
 * The unsubscribe link that goes in a footer.
 *
 * Points at mWeb rather than the marketing site because mWeb is where the
 * signed-in version of the same screen lives — one screen, two ways in.
 *
 * With an address it is one-click. Without one it is the same screen behind a
 * sign-in, which is all a CAMPAIGN can offer: a campaign goes out as one HTML
 * body per batch of fifty bcc'd recipients, so there is no per-person link to
 * put in it. Every templated email has a real recipient and gets the real thing.
 */
export function mailPreferenceUrl(appUrl: string, email?: string): string {
  const base = `${appUrl.replace(/\/+$/, '')}/unsubscribe`;
  if (!email?.trim()) return base;
  return `${base}?e=${encodeMailPreferenceEmail(email)}&t=${mailPreferenceToken(email)}`;
}
