import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ASK_DUNCIT_SOCKET_EVENTS,
  applyActionEvent,
  applyDelta,
  applyFailure,
  applyFinal,
  applyToolEvent,
  emptyThread,
  loadOlderAskDuncit,
  openAskDuncitThread,
  type AskDuncitActionView,
  type AskDuncitMessageView,
  type AskDuncitThreadState,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { AskDuncitMessageDocument, AskDuncitMessagesDocument } from '@/graphql/askDuncit';
import { graphqlRequest } from '@/services/graphql.client';
import { openUserSocket } from '@/services/user-socket';

const asMessages = (items: unknown) => (items ?? []) as AskDuncitMessageView[];

/**
 * One Ask Duncit conversation on native: pages of messages plus the streamed
 * answer, folded by the SAME @duncit/utils reducers as mWeb's
 * useAskDuncitThread, over the account's own socket room.
 */
export function useAskDuncitThread(conversationId: string | null) {
  const [thread, setThread] = useState<AskDuncitThreadState>(() => emptyThread(conversationId));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const fetchPage = useCallback(async (id: string, before?: string) => {
    const data = await graphqlRequest(
      AskDuncitMessagesDocument,
      { conversationId: id, before },
      { auth: true },
    );
    return {
      items: asMessages(data.askDuncitMessages.items),
      hasMore: data.askDuncitMessages.has_more,
    };
  }, []);

  useEffect(
    () =>
      openAskDuncitThread(conversationId, threadRef.current, fetchPage, {
        setThread,
        setLoading,
        setLoadError,
        onError: (error) => logs.mobileApp.error('ask-duncit', 'loadThread', { error }),
      }),
    [conversationId, fetchPage],
  );

  const loadOlder = useCallback(
    () =>
      loadOlderAskDuncit(threadRef.current, loading, fetchPage, {
        setThread,
        setLoading,
        onError: (error) => logs.mobileApp.error('ask-duncit', 'loadOlder', { error }),
      }),
    [fetchPage, loading],
  );

  // Streamed frames over the account's socket room; a reconnect re-reads the
  // streaming answer, since frames sent while offline are gone.
  useEffect(() => {
    let cancelled = false;
    let socket: Awaited<ReturnType<typeof openUserSocket>> = null;
    const resync = async () => {
      const id = threadRef.current.streamingId;
      if (!id) return;
      try {
        const data = await graphqlRequest(AskDuncitMessageDocument, { id }, { auth: true });
        const message = data.askDuncitMessage as AskDuncitMessageView;
        if (message.status !== 'STREAMING') setThread((prev) => applyFinal(prev, message));
      } catch (error) {
        logs.mobileApp.warn('ask-duncit', 'resync', { error });
      }
    };
    openUserSocket(() => cancelled)
      .then((s) => {
        socket = s;
        if (!s) return;
        let connectedOnce = false;
        s.on('connect', () => {
          if (connectedOnce) resync().catch(() => undefined);
          connectedOnce = true;
        });
        s.on(ASK_DUNCIT_SOCKET_EVENTS.delta, (e: { message_id: string; text: string }) =>
          setThread((prev) => applyDelta(prev, e)),
        );
        s.on(
          ASK_DUNCIT_SOCKET_EVENTS.tool,
          (e: { message_id: string; name: string; title?: string; status: string }) =>
            setThread((prev) => applyToolEvent(prev, e)),
        );
        s.on(ASK_DUNCIT_SOCKET_EVENTS.action, (e: { action?: AskDuncitActionView }) => {
          if (e?.action)
            setThread((prev) => applyActionEvent(prev, e.action as AskDuncitActionView));
        });
        s.on(ASK_DUNCIT_SOCKET_EVENTS.done, (e: { message?: AskDuncitMessageView }) => {
          if (e?.message) setThread((prev) => applyFinal(prev, e.message as AskDuncitMessageView));
        });
        s.on(ASK_DUNCIT_SOCKET_EVENTS.error, (e: { message_id: string; code?: string | null }) =>
          setThread((prev) => applyFailure(prev, e)),
        );
      })
      .catch((error: unknown) => logs.mobileApp.warn('ask-duncit', 'socket', { error }));
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return { thread, setThread, loading, loadError, loadOlder };
}
