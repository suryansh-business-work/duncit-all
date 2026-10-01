import { getUrlConfigs } from '@config/url-configs';
import { signedLink } from '@utils/signed-link';
import { joinUrl } from '@utils/url';

/**
 * The links Drive footage is played through.
 *
 * A `<video>` element and Remotion's decoder fetch with plain GETs — they
 * cannot carry the portal's session token — and Drive's own URLs need the
 * service account's credential. So the authenticated GraphQL call hands out a
 * signed link per file, and the stream route trusts the link alone.
 *
 * Hours, not minutes: a link is baked into the composition the player is
 * running, and an editing session that outlives its links would lose every
 * clip mid-edit. What a leaked link opens is one file the service account can
 * already read, read-only, until it expires.
 *
 * And STABLE within a window: the studio re-reads the reel after every chat
 * turn, and a link that changed each time would make the player throw away and
 * re-download every clip on every message. Signing against the start of the
 * current window gives the same file the same link for that whole window, at
 * the cost of a link living between one and two windows.
 */

const WINDOW_MS = 6 * 60 * 60 * 1000;
const MEDIA_TTL_MS = 2 * WINDOW_MS;
/** How long a browser may keep the bytes: never past the shortest a link can live. */
export const MEDIA_TTL_SECONDS = WINDOW_MS / 1000;

const MOUNT_PATH = '/reels';
const link = signedLink('reel-media', MEDIA_TTL_MS);

/** The start of the signing window `now` falls in. */
const windowStart = (now: number): number => Math.floor(now / WINDOW_MS) * WINDOW_MS;

/** The Drive file a link names, or null when it is forged or expired. */
export const verifyMediaToken = (token: string): string | null => link.verify(token);

export interface ReelMediaLinks {
  /** The file itself, range requests honoured. */
  media: (driveFileId: string) => string;
  /** Drive's preview frame for it. */
  thumbnail: (driveFileId: string) => string;
}

/** A link builder bound to this server's public address, resolved once per request. */
export async function reelMediaLinks(): Promise<ReelMediaLinks> {
  const { serverUrl } = await getUrlConfigs();
  const base = joinUrl(serverUrl, MOUNT_PATH);
  const from = windowStart(Date.now());
  return {
    media: (driveFileId) => `${base}/media/${link.sign(driveFileId, from)}`,
    thumbnail: (driveFileId) => `${base}/thumbnail/${link.sign(driveFileId, from)}`,
  };
}
