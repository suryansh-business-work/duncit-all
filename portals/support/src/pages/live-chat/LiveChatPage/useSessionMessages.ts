import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  CHAT_HISTORY_PAGE,
  hasOlderPage,
  mergeEarlierMessages,
  olderPageCursor,
} from '@duncit/utils';
import { SUPPORT_CHAT_MESSAGES, type SupportChatMessage } from '../../../graphql/supportChat';

type Page = { supportChatMessages: SupportChatMessage[] };

const timeOf = (message: SupportChatMessage): string => message.created_at;

/**
 * The open chat's lines: its newest page on open, older pages in front as the
 * agent scrolls up, and live socket lines appended at the end. A created_at
 * cursor, not an offset — the chat keeps growing while it is read.
 */
export function useSessionMessages(sessionId: string | null, onError: (message: string) => void) {
  const client = useApolloClient();
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  /** A ref, not the state: two scroll events in one frame would both read `false`. */
  const inFlight = useRef(false);
  const currentSession = useRef(sessionId);
  currentSession.current = sessionId;

  const query = useQuery<Page>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: sessionId, limit: CHAT_HISTORY_PAGE },
    skip: !sessionId,
    fetchPolicy: 'network-only',
  });

  // Another chat starts empty, never on the last one's lines.
  useEffect(() => {
    setMessages([]);
    setHasMore(false);
  }, [sessionId]);

  useEffect(() => {
    const page = query.data?.supportChatMessages;
    if (!page) return;
    setMessages(page);
    setHasMore(hasOlderPage(page.length));
  }, [query.data]);

  /** A live line from the socket; the same line twice is kept once. */
  const append = useCallback((message: SupportChatMessage) => {
    setMessages((prev) => (prev.some((p) => p.id === message.id) ? prev : [...prev, message]));
  }, []);

  const loadOlder = useCallback(async () => {
    const before = olderPageCursor(messages, timeOf);
    if (!sessionId || !before || inFlight.current) return;
    inFlight.current = true;
    setLoadingOlder(true);
    try {
      const { data } = await client.query<Page>({
        query: SUPPORT_CHAT_MESSAGES,
        variables: { session_id: sessionId, limit: CHAT_HISTORY_PAGE, before },
        fetchPolicy: 'network-only',
      });
      // The agent opened another chat while this page was on its way.
      if (currentSession.current !== sessionId) return;
      const page = data?.supportChatMessages ?? [];
      setHasMore(hasOlderPage(page.length));
      setMessages((current) => mergeEarlierMessages(page, current));
    } catch (err) {
      // The lines on screen stay; scrolling up again is the retry.
      onError((err as Error).message);
    } finally {
      inFlight.current = false;
      setLoadingOlder(false);
    }
  }, [client, sessionId, messages, onError]);

  return { messages, loading: query.loading, hasMore, loadingOlder, loadOlder, append };
}
