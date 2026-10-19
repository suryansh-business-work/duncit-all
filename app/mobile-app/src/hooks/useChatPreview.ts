import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  CHAT_PREVIEW_PAGE,
  hasEarlierMessages,
  mergeEarlierMessages,
  type ChatPreviewKind,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { ChatPreviewDocument } from '@/graphql/chat';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

type Preview = ResultOf<typeof ChatPreviewDocument>['chatPreview'];
export type PreviewLine = Preview['messages'][number];

const fetchPage = (kind: ChatPreviewKind, id: string, before?: string) =>
  graphqlRequest(
    ChatPreviewDocument,
    {
      ...(kind === 'POD' ? { podId: id } : { clubId: id }),
      limit: CHAT_PREVIEW_PAGE,
      before,
    },
    { auth: true },
  );

/**
 * The chat card's data: the newest page of a room's history, older pages on
 * request (put in front of what is shown, each line once), the total and the
 * viewer's membership. mWeb twin: components/chat-preview/useChatPreview.
 */
export function useChatPreview(kind: ChatPreviewKind, id: string) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [messages, setMessages] = useState<PreviewLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierFailed, setEarlierFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchPage(kind, id);
      setPreview(data.chatPreview);
      setMessages(data.chatPreview.messages);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [kind, id]);

  useEffect(() => {
    fireAndForget(load());
  }, [load]);

  // Scrolling to the top fires many events: one older page at a time.
  const inFlight = useRef(false);
  const loadEarlier = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoadingEarlier(true);
    setEarlierFailed(false);
    try {
      const data = await fetchPage(kind, id, messages[0]?.createdAt);
      setMessages((shown) => mergeEarlierMessages(data.chatPreview.messages, shown));
    } catch (error) {
      // The card says so beside the button; nothing already shown is lost.
      setEarlierFailed(true);
      logs.mobileApp.error('chat-preview', 'loadEarlier', { error });
    } finally {
      inFlight.current = false;
      setLoadingEarlier(false);
    }
  };

  const total = preview?.total_count ?? 0;
  return {
    preview,
    messages,
    total,
    loading: !preview && !error,
    error,
    retry: load,
    canLoadEarlier: hasEarlierMessages(messages.length, total),
    loadEarlier,
    loadingEarlier,
    earlierFailed,
  };
}
