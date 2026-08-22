import { Share } from 'react-native';

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
 */
export const buildProfileUrl = (handle: string) => `${POD_WEB_BASE}/u/${handle}`;

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
 * Two identifiers, deliberately: the short link is minted against the user
 * ID (that is the row the server looks up), while the URL it points at
 * carries the @handle. Passing the handle as the ref would make the tracked
 * link stop resolving the moment somebody renames themselves.
 */
export async function shareProfile(userId: string, name: string, handle?: string | null) {
  const url = await shareUrl('PROFILE', userId, buildProfileUrl(handle || userId));
  try {
    await Share.share({ message: `${name} on Duncit\n${url}`, url, title: name });
  } catch {
    /* user cancelled */
  }
}
