/**
 * Scroll-up history for every chat room — pod, club, support and staff — shared
 * by mWeb, the native app and the portals (rule 27). A room opens on its newest
 * page; reading upwards to the top asks the server for the page before the
 * oldest line shown, and never for the whole history at once.
 *
 * Framework-free: each surface keeps its own list, socket and query client.
 * Merging an older page in front of the loaded lines is `mergeEarlierMessages`.
 */

/** How many lines one page of a room loads — the newest page first, then older. */
export const CHAT_HISTORY_PAGE = 30;

/** How close to the top of the list (px) reading has to come before the older page is asked for. */
export const CHAT_HISTORY_TRIGGER_PX = 120;

/**
 * Whether the server may hold lines older than this page. The server answers at
 * most `pageSize` lines, so a short page is the start of the room; a full one
 * may be followed by more (at worst one extra request answers an empty page).
 */
export const hasOlderPage = (pageLength: number, pageSize: number = CHAT_HISTORY_PAGE): boolean =>
  pageLength >= pageSize;

/** The `before` cursor for the next older page: the oldest loaded line's timestamp, or null when nothing is loaded. */
export function olderPageCursor<T>(messages: ReadonlyArray<T>, timeOf: (message: T) => string): string | null {
  const oldest = messages[0];
  return oldest === undefined ? null : timeOf(oldest);
}

/** Whether a scroll position (px from the top of the list) is close enough to the top to load the older page. */
export const isNearHistoryTop = (scrollTop: number, triggerPx: number = CHAT_HISTORY_TRIGGER_PX): boolean =>
  scrollTop <= triggerPx;

/**
 * Where to put the scroll position after an older page was put above the lines
 * on screen, so the line the reader was looking at stays exactly where it was:
 * the list grew by `heightAfter - heightBefore` above them.
 */
export const anchoredScrollTop = (scrollTopBefore: number, heightBefore: number, heightAfter: number): number =>
  scrollTopBefore + Math.max(0, heightAfter - heightBefore);
