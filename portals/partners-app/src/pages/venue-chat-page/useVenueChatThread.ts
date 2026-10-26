import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { mergeVenueChatLines, VENUE_CHAT_PAGE, withoutVenueChatLine, type VenueChatLine } from '@duncit/utils';
import { SEND_VENUE_CHAT_MESSAGE, VENUE_CHAT_MESSAGES, VENUE_CHAT_POLL_MS } from './queries';

const LOGGER = logs.portal['partners-app'];

/**
 * The thread with a freshly polled newest page laid over it: every line on the
 * page as it is now (an edit or a reaction shows), and any line the page should
 * have carried but did not — its author took it back — dropped. A page shorter
 * than a full one is the whole thread; a line sent from here (`sentHere`) that
 * is newer than the page — the poll was on its way while it was sent — is kept.
 */
export function syncWithPage(
  current: readonly VenueChatLine[],
  page: readonly VenueChatLine[],
  sentHere: ReadonlySet<string>,
): VenueChatLine[] {
  const onPage = new Set(page.map((line) => line.id));
  const oldest = page.length >= VENUE_CHAT_PAGE ? Date.parse(page[0]?.createdAt ?? '') : -Infinity;
  const newest = page.length > 0 ? Date.parse(page[page.length - 1]?.createdAt ?? '') : -Infinity;
  const kept = current.filter((line) => {
    const at = Date.parse(line.createdAt);
    return onPage.has(line.id) || at < oldest || (at > newest && sentHere.has(line.id));
  });
  return mergeVenueChatLines(kept, page);
}

/**
 * One pod's venue ↔ host thread: the latest page, re-read every
 * VENUE_CHAT_POLL_MS while the thread is open, plus whatever was sent or
 * changed from here. A poll never marks the thread read (a tab nobody is
 * looking at has read nothing) — the page marks it when the owner is looking.
 */
export function useVenueChatThread(podId: string) {
  const [lines, setLines] = useState<VenueChatLine[]>([]);
  // Lines sent from this tab that no poll has carried yet.
  const sentHere = useRef(new Set<string>());
  const latest = useQuery(VENUE_CHAT_MESSAGES, {
    variables: { pod_id: podId, limit: VENUE_CHAT_PAGE, mark_read: false },
    pollInterval: VENUE_CHAT_POLL_MS,
    fetchPolicy: 'network-only',
  });
  const [send, sendState] = useMutation(SEND_VENUE_CHAT_MESSAGE);

  useEffect(() => {
    const page = latest.data?.venueChatMessages;
    if (!page) return;
    for (const line of page) sentHere.current.delete(line.id);
    setLines((current) => syncWithPage(current, page, sentHere.current));
  }, [latest.data]);

  useEffect(() => {
    if (latest.error) LOGGER.warn('VenueChatPage', 'useVenueChatThread.load', { error: latest.error });
  }, [latest.error]);

  /** Sends one text line; resolves false (and logs) when the server refused it. */
  const sendText = async (text: string): Promise<boolean> => {
    try {
      const result = await send({ variables: { pod_id: podId, type: 'TEXT', text } });
      const line = result.data?.sendVenueChatMessage;
      if (line) {
        sentHere.current.add(line.id);
        setLines((current) => mergeVenueChatLines(current, [line]));
      }
      return true;
    } catch (error: unknown) {
      LOGGER.error('VenueChatPage', 'useVenueChatThread.send', { error });
      return false;
    }
  };

  /** A line changed from here (edited, reacted to) — shown as it is now. */
  const putLine = useCallback((line: VenueChatLine) => setLines((current) => mergeVenueChatLines(current, [line])), []);
  /** A line taken back from here. */
  const removeLine = useCallback((id: string) => setLines((current) => withoutVenueChatLine(current, id)), []);

  return {
    lines,
    /** Only the first read shows a spinner; later polls refresh in place. */
    loading: latest.loading && !latest.data,
    error: latest.error,
    retry: latest.refetch,
    sending: sendState.loading,
    sendText,
    putLine,
    removeLine,
  };
}
