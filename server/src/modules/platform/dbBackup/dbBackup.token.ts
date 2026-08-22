import crypto from 'node:crypto';

/**
 * Short-lived, HMAC-signed permission to download ONE archive.
 *
 * A backup is the whole database in a file, so it cannot sit behind a static
 * nginx location the way build artifacts do. It cannot ride the session token
 * either: a browser download is a plain GET the page cannot put an
 * Authorization header on. So the portal asks GraphQL — where the caller is
 * already authorised as SUPER_ADMIN — for a link, and gets one that names a
 * single backup and stops working within minutes.
 *
 * Stateless on purpose: nothing to store, nothing to clean up, and a signature
 * that survives a restart. The cost is that a token cannot be revoked before it
 * expires, which is why the window is minutes rather than hours.
 */

/** How long a minted link stays good. Minutes, deliberately; see above. */
export const DOWNLOAD_TTL_MS = 5 * 60_000;

interface TokenPayload {
  /** Backup row id. */
  b: string;
  /** Expiry, epoch milliseconds. */
  e: number;
}

const secret = () => process.env.JWT_SECRET || 'dev-secret';

const sign = (body: string) =>
  crypto.createHmac('sha256', secret()).update(body).digest('base64url');

/** A token good for one backup, for the next few minutes. */
export function signDownloadToken(backupId: string, now: number = Date.now()): string {
  const payload: TokenPayload = { b: backupId, e: now + DOWNLOAD_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** The backup id a token authorises, or null when it is forged or expired. */
export function verifyDownloadToken(token: string, now: number = Date.now()): string | null {
  const [body, signature] = (token || '').split('.');
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (!payload.b || typeof payload.e !== 'number' || payload.e < now) return null;
    return payload.b;
  } catch {
    return null;
  }
}
