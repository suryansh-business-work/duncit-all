import { Share } from 'react-native';

import { POD_WEB_BASE } from '@/utils/pod-format';

/** Web URL for a post — opens mWeb's /post/:postId (matches the deep-link config). */
export const buildPostUrl = (postId: string) => `${POD_WEB_BASE}/post/${postId}`;

/** Web URL for a public profile — opens mWeb's /u/:userId (matches the deep-link config). */
export const buildProfileUrl = (userId: string) => `${POD_WEB_BASE}/u/${userId}`;

/** Opens the OS share sheet for a post; swallows the user-cancelled rejection. */
export async function sharePost(postId: string, title: string) {
  const url = buildPostUrl(postId);
  try {
    await Share.share({ message: `${title}\n${url}`, url, title });
  } catch {
    /* user cancelled */
  }
}

/** Opens the OS share sheet for a profile; swallows the user-cancelled rejection. */
export async function shareProfile(userId: string, name: string) {
  const url = buildProfileUrl(userId);
  try {
    await Share.share({ message: `${name} on Duncit\n${url}`, url, title: name });
  } catch {
    /* user cancelled */
  }
}
