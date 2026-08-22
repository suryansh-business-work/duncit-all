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
 */
export const buildProfileUrl = (handle: string) =>
  `${globalThis.window.location.origin}/u/${handle}`;

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
 * Share a public profile, through its tracked link.
 *
 * Two identifiers, deliberately: the short link is minted against the user
 * ID (that is the row the server looks up), while the URL it points at
 * carries the @handle. Passing the handle as the ref would make the tracked
 * link stop resolving the moment somebody renames themselves.
 */
export const shareProfile = async (userId: string, name: string, handle?: string | null) => {
  const url = buildProfileUrl(handle || userId);
  return share(await shareUrl('PROFILE', userId, url), name, `${name} on Duncit`);
};
