import { Share } from 'react-native';
import { profileUrl } from '@duncit/utils';

import { shareUrl } from '@/services/share-link';
import { POD_WEB_BASE } from '@/utils/pod-format';

/** Web URL for a post — opens mWeb's /post/:postId (matches the deep-link config). */
export const buildPostUrl = (postId: string) => `${POD_WEB_BASE}/post/${postId}`;

/**
 * Web URL for a public profile — opens mWeb's /u/:handle (matches the
 * deep-link config).
 *
 * `handle` is the @username, which is what makes the link readable and what a
 * crawler indexes. An account created before handles existed has none and
 * falls back to its id; the route resolves both.
 *
 * Built through @duncit/utils' `profileUrl` — the same call ProfileHandleLink
 * copies from — so the shared link and the copied link cannot drift into two
 * addresses for one profile (rule 40).
 */
export const buildProfileUrl = (handle: string) => profileUrl(POD_WEB_BASE, handle);

/** Opens the OS share sheet for a post; swallows the user-cancelled rejection.
 * The link handed out is the tracked one, as on mWeb (rule 27). */
export async function sharePost(postId: string, title: string) {
  const url = await shareUrl('POST', postId, buildPostUrl(postId));
  try {
    await Share.share({ message: `${title}\n${url}`, url, title });
  } catch {
    /* user cancelled */
  }
}

/**
 * Opens the OS share sheet for a profile; swallows the user-cancelled
 * rejection.
 *
 * A profile has ONE address, and it is the readable one: this hands out the
 * very same /u/:handle URL the @handle beside the name copies. It is
 * deliberately NOT minted as a tracked duncit.com short link — that link
 * resolves on the apex through a client-side hop, so a crawler only ever sees
 * the site's default card and a shared profile previewed as "Duncit" rather
 * than as the person, while the copied one previewed as their name. Two links
 * for one profile is the bug; the tracked link is what has to give. mWeb
 * shares the identical URL (rule 27).
 */
export async function shareProfile(userId: string, name: string, handle?: string | null) {
  const url = buildProfileUrl(handle || userId);
  try {
    await Share.share({ message: `${name} on Duncit\n${url}`, url, title: name });
  } catch {
    /* user cancelled */
  }
}
