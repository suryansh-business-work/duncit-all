import { profileUrl } from '@duncit/utils';
import { notifySuccess } from '../components/notify';
import { shareUrl } from '../lib/share-link';

/** Web URL for a post — /post/:postId (matches AppRoutes + the mobile deep-link config). */
export const buildPostUrl = (postId: string) => `${globalThis.window.location.origin}/post/${postId}`;

/**
 * Web URL for a public profile — /u/:handle (matches AppRoutes + the mobile
 * deep-link config).
 *
 * `handle` is the @username, which is what makes the link readable and what
 * a crawler indexes. An account created before handles existed has none and
 * falls back to its id; the route resolves both.
 *
 * Built through @duncit/utils' `profileUrl` — the same call ProfileHandleLink
 * copies from — so the shared link and the copied link cannot drift into two
 * addresses for one profile (rule 40).
 */
export const buildProfileUrl = (handle: string) =>
  profileUrl(globalThis.window.location.origin, handle);

/** Native share when available, else copy the link and toast. Swallows cancels. */
async function share(url: string, title: string, text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    notifySuccess('Link copied to clipboard');
  } catch {
    /* user cancelled or clipboard unavailable */
  }
}

/** Share a post (post detail page). Handed out as the tracked duncit.com link
 * so the visits it brings back are attributed to the share (rule 40). */
export const sharePost = async (postId: string, title: string) =>
  share(await shareUrl('POST', postId, buildPostUrl(postId)), title, title);

/**
 * Share a public profile.
 *
 * A profile has ONE address, and it is the readable one: this hands out the
 * very same /u/:handle URL the @handle beside the name copies. It is
 * deliberately NOT minted as a tracked duncit.com short link — that link
 * resolves on the apex through a client-side hop, so a crawler only ever sees
 * the site's default card and a shared profile previewed as "Duncit" rather
 * than as the person, while the copied one previewed as their name. Two links
 * for one profile is the bug; the tracked link is what has to give.
 */
export const shareProfile = (userId: string, name: string, handle?: string | null) =>
  share(buildProfileUrl(handle || userId), name, `${name} on Duncit`);
