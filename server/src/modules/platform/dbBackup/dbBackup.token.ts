import { signedLink } from '@utils/signed-link';

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
 * The signing, the expiry and the constant-time check are `@utils/signed-link`,
 * which the ticket PDF route signs with too (rule 40). What stays here is what
 * is this route's own: how long its links live, and the purpose that keeps a
 * backup token from ever opening anything else.
 */

/** How long a minted link stays good. Minutes, deliberately; see above. */
export const DOWNLOAD_TTL_MS = 5 * 60_000;

const link = signedLink('db-backup', DOWNLOAD_TTL_MS);

/** A token good for one backup, for the next few minutes. */
export const signDownloadToken = (backupId: string, now?: number): string =>
  link.sign(backupId, now);

/** The backup id a token authorises, or null when it is forged or expired. */
export const verifyDownloadToken = (token: string, now?: number): string | null =>
  link.verify(token, now);
