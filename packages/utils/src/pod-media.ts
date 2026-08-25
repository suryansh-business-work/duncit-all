/**
 * Pod media — the framework-free half, shared by mWeb and the native app
 * (rules 27/40).
 *
 * The photos and videos FROM a pod: what the host uploaded and what the people
 * who came sent in from the link the host gave them. This module owns the ONE
 * address that page lives at, so the mWeb route, the native deep link, the
 * short link the server mints and the message a host sends can never point at
 * four different places.
 */

/** Where a pod's media page lives on the web. */
export const podMediaPath = (podId: string): string => `/pod/${podId}/media`;

/** The same path as a full URL, for a message that leaves the app. */
export const podMediaLink = (podId: string, baseUrl: string): string =>
  `${baseUrl}${podMediaPath(podId)}`;

/** One item as every surface renders it — the board's row, minus the plumbing. */
export interface PodMediaItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  source: 'HOST' | 'GUEST';
  uploaded_by_name: string;
  uploaded_at?: string | null;
  mine: boolean;
  can_remove: boolean;
}

/**
 * Why a viewer cannot upload, as a translation key — never a sentence. The
 * board answers with a role and two booleans; turning those into the ONE thing
 * to say lives here so mWeb's page and the app's screen cannot say different
 * things about the same pod.
 */
export function podMediaBlockedKey(
  viewer: 'HOST' | 'GUEST' | 'NONE',
  isCancelled: boolean,
): string | null {
  if (viewer === 'NONE') return 'mweb.podMedia.notInvited';
  if (isCancelled) return 'mweb.podMedia.cancelled';
  return null;
}
