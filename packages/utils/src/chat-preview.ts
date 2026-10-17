/**
 * The chat card at the bottom of a pod's and a club's details page, shared by
 * mWeb and the native app (rule 27) so both draw the same card from the same
 * answers. Framework-free: each app keeps its own MUI or Tamagui card.
 *
 * The server's `chatPreview` decides who is a member and which lines anyone
 * may read; this only turns that answer into what the card shows.
 */

/** Whose room the card shows. */
export type ChatPreviewKind = 'POD' | 'CLUB';

/** How many lines one page of the card loads — the newest first page, then older. */
export const CHAT_PREVIEW_PAGE = 50;

/**
 * What the card's button does:
 *  - OPEN       a member opens the full room to post;
 *  - JOIN_CLUB  a club visitor joins (follows) the club, which is joining its room;
 *  - BOOK_POD   a pod visitor must book a spot first — the card says so.
 */
export type ChatPreviewAction = 'OPEN' | 'JOIN_CLUB' | 'BOOK_POD';

export function chatPreviewAction(kind: ChatPreviewKind, isMember: boolean): ChatPreviewAction {
  if (isMember) return 'OPEN';
  return kind === 'CLUB' ? 'JOIN_CLUB' : 'BOOK_POD';
}

/** mWeb's room for a pod or a club — both keyed by the document id. */
export const chatRoomPath = (kind: ChatPreviewKind, id: string): string =>
  kind === 'CLUB' ? `/chats/club/${id}` : `/chats/${id}`;

/** Whether older lines exist beyond the ones already loaded. */
export const hasEarlierMessages = (loaded: number, total: number): boolean => loaded < total;

/**
 * An older page put in front of the lines already shown, oldest first. A line
 * that arrives on both pages (a message posted while paging shifts the window)
 * is kept once, in its older position.
 */
export function mergeEarlierMessages<T extends { id: string }>(
  earlier: ReadonlyArray<T>,
  current: ReadonlyArray<T>,
): T[] {
  const seen = new Set(earlier.map((m) => m.id));
  return [...earlier, ...current.filter((m) => !seen.has(m.id))];
}
