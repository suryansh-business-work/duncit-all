import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  VENUE_CHAT_PAGE,
  isVenueChatUnavailable,
  mergeVenueChatLines,
  withReadMark,
  withoutVenueChatLine,
  type VenueChatReadMark,
} from '@duncit/utils';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { PodMessageType } from '@/generated/graphql/graphql';
import {
  SendVenueChatMessageDocument,
  VenueChatMessagesDocument,
  VenueChatRoomDocument,
} from '@/graphql/venue-chat';
import { useChatHistory } from '@/hooks/useChatHistory';
import { uploadChatImage, type ChatImageAsset } from '@/hooks/useChatRoom';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { errorCode, toErrorMessage } from '@/utils/errors';

export type VenueChatRoom = ResultOf<typeof VenueChatRoomDocument>['venueChatRoom'];
/** A thread's line: the group chat's fields, and on an OFFER line the move it records. */
export type VenueChatMessage = ResultOf<
  typeof VenueChatMessagesDocument
>['venueChatMessages'][number];

const lineTime = (line: VenueChatMessage) => line.createdAt;

/** The thread and its newest page, read together — reading that page marks the thread read. */
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
 * each once, oldest first), how far every other member has read it, and the
 * sends. The screen owns the socket and feeds it in through `addLines`
 * (a new line), `replaceLine` (a changed one), `removeLine` and `addMark`.
 */
export function useVenueChat(podId: string) {
  const { t } = useTranslation();
  const [room, setRoom] = useState<VenueChatRoom | null>(null);
  const [messages, setMessages] = useState<VenueChatMessage[]>([]);
  const [marks, setMarks] = useState<VenueChatReadMark[]>([]);
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
        setMarks(thread.room.read_marks);
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
    (incoming: readonly VenueChatMessage[]) =>
      setMessages((shown) => mergeVenueChatLines(shown, incoming)),
    [],
  );
  // A changed line replaces its copy where it is on screen; one on a page not
  // loaded stays out, so the scroll-up history never skips past a gap.
  const replaceLine = useCallback(
    (line: VenueChatMessage) =>
      setMessages((shown) => shown.map((current) => (current.id === line.id ? line : current))),
    [],
  );
  const removeLine = useCallback(
    (id: string) => setMessages((shown) => withoutVenueChatLine(shown, id)),
    [],
  );
  const addMark = useCallback(
    (mark: VenueChatReadMark) => setMarks((current) => withReadMark(current, mark)),
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
    marks,
    isLoading,
    unavailable,
    loadFailed,
    history,
    sending,
    error,
    setError,
    reload,
    addLines,
    replaceLine,
    removeLine,
    addMark,
    sendText,
    sendImage,
  };
}
