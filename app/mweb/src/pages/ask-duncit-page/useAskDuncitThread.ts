import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  applyActionEvent,
  applyDelta,
  applyFailure,
  applyFinal,
  applyToolEvent,
  emptyThread,
  prependOlder,
  type AskDuncitThreadState,
} from '@duncit/utils';
import { logs } from '@duncit/logs';
import { ASK_DUNCIT_MESSAGE, ASK_DUNCIT_MESSAGES, type Message } from './queries';
import { useAskDuncitSocket } from './useAskDuncitSocket';

/**
 * One conversation's messages: loaded page by page (newest first, older on
 * scroll-up), with the streamed answer folded in by the shared @duncit/utils
 * reducers — the same functions the native screen uses.
 */
export function useAskDuncitThread(conversationId: string | null) {
  const client = useApolloClient();
  const [thread, setThread] = useState<AskDuncitThreadState>(() => emptyThread(conversationId));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const fetchPage = useCallback(
    async (id: string, before?: string) => {
      const { data } = await client.query<{ askDuncitMessages: { items: Message[]; has_more: boolean } }>({
        query: ASK_DUNCIT_MESSAGES,
        variables: { conversationId: id, before },
        fetchPolicy: 'network-only',
      });
      return data?.askDuncitMessages ?? { items: [], has_more: false };
    },
    [client]
  );

  // Switching conversation (or the first send creating one) reloads the thread —
  // unless it is the conversation this screen just created, which is already shown.
  useEffect(() => {
    if (!conversationId) {
      setThread(emptyThread(null));
      return;
    }
    if (threadRef.current.conversationId === conversationId && threadRef.current.messages.length) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchPage(conversationId)
      .then((page) => {
        if (!cancelled) setThread({ ...emptyThread(conversationId), messages: page.items, hasMore: page.has_more });
      })
      .catch((error: unknown) => {
        logs.mWeb.error('ask-duncit', 'loadThread', { error });
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, fetchPage]);

  const loadOlder = useCallback(async () => {
    const current = threadRef.current;
    if (!current.conversationId || !current.hasMore || loading) return;
    const first = current.messages.find((m) => !m.id.startsWith('temp-'));
    setLoading(true);
    try {
      const page = await fetchPage(current.conversationId, first?.id);
      setThread((prev) => prependOlder(prev, page.items, page.has_more));
    } catch (error) {
      logs.mWeb.error('ask-duncit', 'loadOlder', { error });
    } finally {
      setLoading(false);
    }
  }, [fetchPage, loading]);

  /** Re-read the streaming answer from the server — after a reconnect, frames may be missing. */
  const resync = useCallback(async () => {
    const id = threadRef.current.streamingId;
    if (!id) return;
    try {
      const { data } = await client.query<{ askDuncitMessage: Message }>({ query: ASK_DUNCIT_MESSAGE, variables: { id }, fetchPolicy: 'network-only' });
      if (data?.askDuncitMessage && data.askDuncitMessage.status !== 'STREAMING') setThread((prev) => applyFinal(prev, data.askDuncitMessage));
    } catch (error) {
      logs.mWeb.warn('ask-duncit', 'resync', { error });
    }
  }, [client]);

  useAskDuncitSocket({
    onDelta: (e) => setThread((prev) => applyDelta(prev, e)),
    onTool: (e) => setThread((prev) => applyToolEvent(prev, e)),
    onAction: (a) => setThread((prev) => applyActionEvent(prev, a)),
    onDone: (m) => setThread((prev) => applyFinal(prev, m)),
    onError: (e) => setThread((prev) => applyFailure(prev, e)),
    onReconnect: () => {
      resync().catch(() => undefined);
    },
  });

  return { thread, setThread, loading, loadError, loadOlder };
}
