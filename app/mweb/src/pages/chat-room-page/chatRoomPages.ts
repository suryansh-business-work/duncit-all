import { mergeEarlierMessages, olderPageCursor } from '@duncit/utils';
import type { ChatMessage, ClubRoomData, PodRoomData } from './chat.types';

/** How a fetched page joins the lines the cache already holds, oldest first. */
export type PageMerge = (shown: ChatMessage[], page: ChatMessage[]) => ChatMessage[];

const timeOf = (m: ChatMessage) => m.createdAt;

/** An older page goes in front of what is shown, each line once. */
export const prependOlderPage: PageMerge = (shown, page) => mergeEarlierMessages(page, shown);

/**
 * A fresh newest page (a socket refresh) replaces the newest lines but keeps
 * every older page the reader already scrolled up through, so a reaction
 * elsewhere in the room never throws them back to the last 30 lines.
 */
export const refreshNewestPage: PageMerge = (shown, page) => {
  const newestStart = olderPageCursor(page, timeOf);
  if (newestStart === null) return page;
  return mergeEarlierMessages(
    shown.filter((m) => m.createdAt < newestStart),
    page,
  );
};

/** The oldest loaded line's time: the `before` of the next older page. */
export const roomCursor = (messages: ChatMessage[]) => olderPageCursor(messages, timeOf);

/** A pod page result: the lean older page (lines only) or the whole room re-read. */
export type PodPage = Pick<PodRoomData, 'podMessages'> & Partial<PodRoomData>;
/** A club page result: the lean older page (lines only) or the whole room re-read. */
export type ClubPage = Pick<ClubRoomData, 'clubMessages'> & Partial<ClubRoomData>;

/** Writes a page into the cached pod room; any room fields it carries are the fresher. */
export const podPageInto =
  (merge: PageMerge) =>
  (shown: PodRoomData, { fetchMoreResult }: { fetchMoreResult: PodPage }): PodRoomData => ({
    ...shown,
    ...fetchMoreResult,
    podMessages: merge(shown.podMessages, fetchMoreResult.podMessages),
  });

/** Writes a page into the cached club room; any room fields it carries are the fresher. */
export const clubPageInto =
  (merge: PageMerge) =>
  (shown: ClubRoomData, { fetchMoreResult }: { fetchMoreResult: ClubPage }): ClubRoomData => ({
    ...shown,
    ...fetchMoreResult,
    clubMessages: merge(shown.clubMessages, fetchMoreResult.clubMessages),
  });
