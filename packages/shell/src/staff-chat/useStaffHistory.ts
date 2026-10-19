import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApolloClient } from '@apollo/client';
import {
  CHAT_HISTORY_PAGE,
  hasOlderPage,
  mergeEarlierMessages,
  olderPageCursor,
} from '@duncit/utils';
import { STAFF_MESSAGES, type StaffMessage } from './queries';

interface Options {
  client: ApolloClient;
  peerId: string | undefined;
  /** The newest page, as the live query last answered it, oldest first. */
  live: StaffMessage[];
  onError: (error: Error) => void;
}

const timeOf = (message: StaffMessage): string => message.created_at ?? '';
const at = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : Number.NaN);

/**
 * The lines of one staff conversation above its live page.
 *
 * The live query only ever holds the newest `CHAT_HISTORY_PAGE` lines and is
 * re-read on every arrival, so its oldest line falls off the page each time
 * somebody speaks. Those lines are kept here, with every page fetched by
 * scrolling up, so nothing the reader already had vanishes from the screen.
 * A created_at cursor, not an offset: the thread grows while it is scrolled.
 */
export function useStaffHistory({ client, peerId, live, onError }: Options) {
  const [older, setOlder] = useState<StaffMessage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  /** A ref, not the state: two scroll events in one frame would both read `false`. */
  const inFlight = useRef(false);
  const currentPeer = useRef(peerId);
  currentPeer.current = peerId;
  const previous = useRef<{ peerId: string | undefined; rows: StaffMessage[] }>({ peerId, rows: live });

  // A different conversation starts its own history.
  useEffect(() => {
    setOlder([]);
    setReachedStart(false);
  }, [peerId]);

  // Carry the lines the live page just let go of: older than its new first line.
  useEffect(() => {
    const before = previous.current;
    previous.current = { peerId, rows: live };
    if (before.peerId !== peerId) return;
    const kept = new Set(live.map((message) => message.id));
    const firstAt = at(live[0]?.created_at);
    const dropped = before.rows.filter(
      (message) => !kept.has(message.id) && at(message.created_at) < firstAt
    );
    if (dropped.length > 0) setOlder((current) => mergeEarlierMessages(current, dropped));
  }, [peerId, live]);

  /** History, then the live page; a line on both is read from the live copy, which is fresher. */
  const messages = useMemo(() => {
    const seen = new Set(live.map((message) => message.id));
    return [...older.filter((message) => !seen.has(message.id)), ...live];
  }, [older, live]);

  const loadOlder = useCallback(async () => {
    const before = olderPageCursor(messages, timeOf);
    if (!peerId || !before || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const page = await client.query<{ staffMessages: StaffMessage[] }>({
        query: STAFF_MESSAGES,
        variables: { peerId, limit: CHAT_HISTORY_PAGE, before },
        fetchPolicy: 'network-only',
      });
      // The reader moved to another conversation while this one was answering.
      if (currentPeer.current !== peerId) return;
      const rows = page.data?.staffMessages ?? [];
      if (!hasOlderPage(rows.length)) setReachedStart(true);
      if (rows.length > 0) setOlder((current) => mergeEarlierMessages(rows, current));
    } catch (err) {
      // What is on screen stays; the "Earlier messages" button is the retry.
      onError(err as Error);
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [client, peerId, messages, onError]);

  /** After "clear for both": the local copies went with it, and there is nothing above. */
  const clearHistory = useCallback(() => {
    setOlder([]);
    setReachedStart(true);
  }, []);

  const hasMore =
    !reachedStart && messages.length > 0 && (older.length > 0 || hasOlderPage(live.length));

  return { messages, hasMore, loadingMore, loadOlder, clearHistory };
}
