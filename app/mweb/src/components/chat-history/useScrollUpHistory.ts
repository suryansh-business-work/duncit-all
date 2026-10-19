import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { fireAndForget, logs } from '@duncit/logs';
import { anchoredScrollTop, isNearHistoryTop } from '@duncit/utils';

interface ScrollUpHistoryOptions {
  /** The chat's scrolling log. */
  scrollRef: RefObject<HTMLElement | null>;
  /** The oldest line shown: it changes once an older page is in. */
  oldestId: string | undefined;
  /** Whether the server may still hold older lines. */
  canLoadOlder: boolean;
  /** Fetches the page before the oldest line and merges it in; rejects when it failed. */
  loadOlder: () => Promise<unknown>;
}

/**
 * Scroll-up history for a chat log, the same in every mWeb room: reading up to
 * the top loads the page before the oldest line (one request at a time), and
 * the line the reader was on stays exactly where it was once the page is put
 * above it. A failed page waits for the reader's "Show earlier" instead of
 * retrying on every scroll.
 */
export function useScrollUpHistory({ scrollRef, oldestId, canLoadOlder, loadOlder }: ScrollUpHistoryOptions) {
  const inFlight = useRef(false);
  const anchor = useRef<{ top: number; height: number } | null>(null);
  // The log's position at its last scroll event; null until it has scrolled once.
  const lastTop = useRef<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);

  // Before paint, so the older page never flashes the reader's line downwards.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const from = anchor.current;
    if (!el || !from) return;
    anchor.current = null;
    el.scrollTop = anchoredScrollTop(from.top, from.height, el.scrollHeight);
    lastTop.current = el.scrollTop;
  }, [oldestId, scrollRef]);

  const showOlder = async () => {
    if (inFlight.current || !canLoadOlder) return;
    inFlight.current = true;
    const el = scrollRef.current;
    anchor.current = el ? { top: el.scrollTop, height: el.scrollHeight } : null;
    setLoadingOlder(true);
    setOlderFailed(false);
    try {
      await loadOlder();
    } catch (error) {
      // Shown beside the control; every line already loaded stays.
      logs.mWeb.error('useScrollUpHistory', 'showOlder', { error });
      anchor.current = null;
      setOlderFailed(true);
    } finally {
      inFlight.current = false;
      setLoadingOlder(false);
    }
  };

  /**
   * Call from the log's onScroll. Only reading UP into the top band asks: a log
   * sits at 0 before its first scroll to the newest line, and that (or the
   * anchoring jump after a page) must never count as reaching the top.
   */
  const onScrollNearTop = () => {
    const el = scrollRef.current;
    if (!el) return;
    const previous = lastTop.current;
    lastTop.current = el.scrollTop;
    const movedUp = previous !== null && el.scrollTop < previous;
    if (movedUp && !olderFailed && isNearHistoryTop(el.scrollTop)) {
      fireAndForget(showOlder(), logs.mWeb, 'useScrollUpHistory', 'onScrollNearTop');
    }
  };

  return { loadingOlder, olderFailed, showOlder, onScrollNearTop };
}
