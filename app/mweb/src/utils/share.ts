import { notifySuccess } from '../components/notify';
import { shareUrl } from '../lib/share-link';

/** Web URL for a post — /post/:postId (matches AppRoutes + the mobile deep-link config). */
export const buildPostUrl = (postId: string) => `${globalThis.window.location.origin}/post/${postId}`;

/** Web URL for a public profile — /u/:userId (matches AppRoutes + the mobile deep-link config). */
export const buildProfileUrl = (userId: string) => `${globalThis.window.location.origin}/u/${userId}`;

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

/** Share a public profile, through its tracked link. */
export const shareProfile = async (userId: string, name: string) =>
  share(await shareUrl('PROFILE', userId, buildProfileUrl(userId)), name, `${name} on Duncit`);
