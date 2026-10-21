import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { VENUE_CHAT_PAGE, isVenueChatUnavailable, mergeVenueChatLines } from '@duncit/utils';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { PodMessageType } from '@/generated/graphql/graphql';
import {
  SendVenueChatMessageDocument,
  VenueChatMessagesDocument,
  VenueChatRoomDocument,
} from '@/graphql/venue-chat';
import type { ChatMessage } from '@/hooks/useChat';
import { useChatHistory } from '@/hooks/useChatHistory';
import { uploadChatImage, type ChatImageAsset } from '@/hooks/useChatRoom';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { errorCode, toErrorMessage } from '@/utils/errors';

export type VenueChatRoom = ResultOf<typeof VenueChatRoomDocument>['venueChatRoom'];

const lineTime = (line: ChatMessage) => line.createdAt;

/** The thread and its newest page, read together. */
async function loadThread(podId: string) {
  const [room, page] = await Promise.all([
    graphqlRequest(VenueChatRoomDocument, { podId }, { auth: true }),
    graphqlRequest(VenueChatMessagesDocument, { podId, limit: VENUE_CHAT_PAGE }, { auth: true }),
  ]);
  return { room: room.venueChatRoom, lines: page.venueChatMessages };
}

/**
 * One venue thread — RN twin of mWeb's useVenueChatThread: who it is with, its
 * lines (the newest page, older pages on scroll-up, sent and socket lines —
 * each once, oldest first) and the sends. The screen owns the socket and feeds
 * its lines in through `addLines`.
 */
export function useVenueChat(podId: string) {
  const { t } = useTranslation();
  const [room, setRoom] = useState<VenueChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const fetchOlder = useCallback(
    async (before: string) =>
      (
        await graphqlRequest(
          VenueChatMessagesDocument,
          { podId, limit: VENUE_CHAT_PAGE, before },
          { auth: true },
        )
      ).venueChatMessages,
    [podId],
  );
  const history = useChatHistory({
    messages,
    setMessages,
    fetchOlder,
    timeOf: lineTime,
    pageSize: VENUE_CHAT_PAGE,
  });
  const { startHistory } = history;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadThread(podId)
      .then((thread) => {
        if (!active) return;
        setRoom(thread.room);
        setMessages(thread.lines);
        setUnavailable(false);
        setLoadFailed(false);
        startHistory(thread.lines.length);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setUnavailable(isVenueChatUnavailable(errorCode(e)));
        setLoadFailed(true);
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId, attempt, startHistory]);

  useRefreshRegistration(reload);

  const addLines = useCallback(
    (incoming: readonly ChatMessage[]) =>
      setMessages((shown) => mergeVenueChatLines(shown, incoming)),
    [],
  );

  const post = async (variables: { type: PodMessageType; text?: string; imageUrl?: string }) => {
    const data = await graphqlRequest(
      SendVenueChatMessageDocument,
      { podId, ...variables },
      { auth: true },
    );
    addLines([data.sendVenueChatMessage]);
  };

  /** Sends a line; true once it is in (the composer clears only then). */
  const sendText = async (text: string) => {
    const body = text.trim();
    if (!body) return false;
    try {
      await post({ type: PodMessageType.Text, text: body });
      return true;
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.venueChat.sendFailed')));
      return false;
    }
  };

  const sendImage = async (asset: ChatImageAsset) => {
    const { base64 } = asset;
    if (!base64) return;
    setSending(true);
    try {
      await post({
        type: PodMessageType.Image,
        imageUrl: await uploadChatImage({ ...asset, base64 }),
      });
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.venueChat.sendFailed')));
    } finally {
      setSending(false);
    }
  };

  return {
    room,
    messages,
    isLoading,
    unavailable,
    loadFailed,
    history,
    sending,
    error,
    setError,
    reload,
    addLines,
    sendText,
    sendImage,
  };
}
