import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { anchoredScrollTop, isNearHistoryTop } from '@duncit/utils';

export interface ScrollUpHistoryOptions {
  /** The scrolling list the lines live in. */
  scrollRef: RefObject<HTMLElement | null>;
  /** Id of the oldest line on screen — it changes when an older page lands in front. */
  oldestId: string | null;
  /** Whether the server may hold lines older than the ones shown (`hasOlderPage`). */
  hasMore: boolean;
  /** An older page is being fetched. The caller guards against a second fetch too. */
  loading: boolean;
  /** Fetch the page before the oldest line and put it in front (`mergeEarlierMessages`). */
  onLoadOlder: () => void;
}

interface Anchor {
  top: number;
  height: number;
  oldestId: string | null;
}

/**
 * Scroll-up history for a portal chat thread — staff chat and the support
 * console share it. Reading up to within `CHAT_HISTORY_TRIGGER_PX` of the top
 * asks for the older page; when it lands in front, the scroll position moves
 * down by exactly the height it added, so the line the reader was on stays put.
 *
 * The list should carry `overflow-anchor: none`: a browser's own scroll
 * anchoring would move it as well and the line would jump by twice the page.
 */
export function useScrollUpHistory({
  scrollRef,
  oldestId,
  hasMore,
  loading,
  onLoadOlder,
}: ScrollUpHistoryOptions) {
  const anchor = useRef<Anchor | null>(null);

  /** Ask for the older page now — the scroll trigger, and a button for keyboard and switch users. */
  const loadOlder = useCallback(() => {
    const node = scrollRef.current;
    if (!node || loading || !hasMore) return;
    anchor.current = { top: node.scrollTop, height: node.scrollHeight, oldestId };
    onLoadOlder();
  }, [scrollRef, loading, hasMore, oldestId, onLoadOlder]);

  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (node && isNearHistoryTop(node.scrollTop)) loadOlder();
  }, [scrollRef, loadOlder]);

  // Before paint, so the reader never sees the list jump to the new top first.
  useLayoutEffect(() => {
    const before = anchor.current;
    const node = scrollRef.current;
    if (!before || !node) return;
    if (before.oldestId !== oldestId) {
      anchor.current = null;
      node.scrollTop = anchoredScrollTop(before.top, before.height, node.scrollHeight);
    } else if (!loading) {
      // The page came back empty or failed: nothing moved, nothing to hold.
      anchor.current = null;
    }
  }, [scrollRef, oldestId, loading]);

  return { onScroll, loadOlder };
}
