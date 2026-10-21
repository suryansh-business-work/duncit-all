import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  CHAT_HISTORY_PAGE,
  hasOlderPage,
  isNearHistoryTop,
  mergeEarlierMessages,
  olderPageCursor,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { fireAndForget } from '@/utils/fire-and-forget';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/**
 * A scroll handler that calls `onReachTop` when the reader scrolls UP to within
 * CHAT_HISTORY_TRIGGER_PX of the top. Upward only: the room's own scroll to its
 * newest line on open starts at the top too, and must not ask for history.
 */
export function useHistoryTopScroll(onReachTop: () => void) {
  const lastY = useRef<number | null>(null);
  return useCallback(
    (e: ScrollEvent) => {
      const y = e.nativeEvent.contentOffset.y;
      const previous = lastY.current;
      lastY.current = y;
      if (previous !== null && y < previous && isNearHistoryTop(y)) onReachTop();
    },
    [onReachTop],
  );
}

interface ChatHistoryOptions<T> {
  /** The lines shown, oldest first — the oldest is the next page's cursor. */
  messages: readonly T[];
  setMessages: Dispatch<SetStateAction<T[]>>;
  /** One page of lines older than `before`, oldest first. */
  fetchOlder: (before: string) => Promise<T[]>;
  /** A line's timestamp, as the server's `before` cursor reads it. */
  timeOf: (message: T) => string;
  /** Lines one page asks for — the rooms' CHAT_HISTORY_PAGE unless the thread pages differently. */
  pageSize?: number;
}

/**
 * Scroll-up history for a chat room — pod, club or support. The owner loads
 * the newest page and calls `startHistory(pageLength)`; reading up to the top
 * then asks for the page before the oldest line, puts it in front (each line
 * once), and stops at a short page. One request at a time, and a page that
 * lands after the room was reloaded is dropped. mWeb runs the same helpers.
 */
export function useChatHistory<T extends { id: string }>({
  messages,
  setMessages,
  fetchOlder,
  timeOf,
  pageSize = CHAT_HISTORY_PAGE,
}: ChatHistoryOptions<T>) {
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);
  const inFlight = useRef(false);
  // Bumped on every newest-page load: an older page from before it is stale.
  const generation = useRef(0);
  const latest = useRef({ messages, fetchOlder, timeOf });
  useEffect(() => {
    latest.current = { messages, fetchOlder, timeOf };
  });

  const startHistory = useCallback(
    (firstPageLength: number) => {
      generation.current += 1;
      inFlight.current = false;
      setLoadingOlder(false);
      setOlderFailed(false);
      setHasOlder(hasOlderPage(firstPageLength, pageSize));
    },
    [pageSize],
  );

  const loadOlder = useCallback(async () => {
    const current = latest.current;
    const before = olderPageCursor(current.messages, current.timeOf);
    if (inFlight.current || !hasOlder || before === null) return;
    const started = generation.current;
    inFlight.current = true;
    setLoadingOlder(true);
    setOlderFailed(false);
    try {
      const page = await current.fetchOlder(before);
      if (started !== generation.current) return;
      setMessages((shown) => mergeEarlierMessages(page, shown));
      setHasOlder(hasOlderPage(page.length, pageSize));
    } catch (error) {
      if (started !== generation.current) return;
      // The top of the list says so and offers the page again; nothing shown is lost.
      setOlderFailed(true);
      logs.mobileApp.error('chat-history', 'loadOlder', { error });
    } finally {
      if (started === generation.current) {
        inFlight.current = false;
        setLoadingOlder(false);
      }
    }
  }, [hasOlder, setMessages, pageSize]);

  const reachTop = useCallback(() => fireAndForget(loadOlder()), [loadOlder]);
  const onScroll = useHistoryTopScroll(reachTop);

  return { hasOlder, loadingOlder, olderFailed, startHistory, loadOlder, onScroll };
}

export type ChatHistory = ReturnType<typeof useChatHistory>;
