import { useCallback, useEffect, useState } from 'react';

import {
  ClubMessagesDocument,
  DeleteChatMessageDocument,
  PodMessagesDocument,
  ReactToPodMessageDocument,
  SendClubMessageDocument,
  SendPodMessageDocument,
} from '@/graphql/chat';
import { UploadImageDocument } from '@/graphql/status';
import { PodMessageType } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { usePodSocket, type ChatRoomKind } from '@/hooks/usePodSocket';
import type { ChatMessage } from '@/hooks/useChat';
import { toErrorMessage } from '@/utils/errors';
import { isPodActive } from '@/utils/pod-format';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export interface ChatImageAsset {
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

/** What a room says about itself beyond its messages. */
interface RoomFacts {
  closed: boolean;
  /** Pod rooms: when the whole room is deleted (ISO). */
  deletesAt: string | null;
  /** Club rooms: how many days a message is kept. */
  retentionDays: number | null;
  canModerate: boolean;
  /** Club rooms: the club's name, for the header. */
  title: string | null;
}

const NO_FACTS: RoomFacts = {
  closed: false,
  deletesAt: null,
  retentionDays: null,
  canModerate: false,
  title: null,
};

const MESSAGE_LIMIT = 80;

/** One page of a pod's or a club's room, with what the room says about itself. */
async function loadRoom(kind: ChatRoomKind, id: string) {
  if (kind === 'POD') {
    const data = await graphqlRequest(PodMessagesDocument, { podId: id, limit: MESSAGE_LIMIT }, { auth: true });
    const ended = !isPodActive(data.pod?.pod_date_time, data.pod?.pod_end_date_time);
    return {
      messages: data.podMessages,
      facts: {
        ...NO_FACTS,
        // The server's word first; the dates are the fallback.
        closed: data.podChatInfo.closed || ended,
        deletesAt: data.podChatInfo.chat_deletes_at ?? null,
        canModerate: data.podChatInfo.can_moderate,
      },
    };
  }
  const data = await graphqlRequest(ClubMessagesDocument, { clubId: id, limit: MESSAGE_LIMIT }, { auth: true });
  return {
    messages: data.clubMessages,
    facts: {
      ...NO_FACTS,
      retentionDays: data.clubChatRoom.retention_days,
      canModerate: data.clubChatRoom.can_moderate,
      title: data.clubChatRoom.club_name,
    },
  };
}

/** Posts one line to the room — the server echoes it over the socket. */
function postTo(kind: ChatRoomKind, id: string, type: PodMessageType, text: string, imageUrl: string | null) {
  return kind === 'POD'
    ? graphqlRequest(SendPodMessageDocument, { podId: id, type, text, imageUrl }, { auth: true })
    : graphqlRequest(SendClubMessageDocument, { clubId: id, type, text, imageUrl }, { auth: true });
}

/**
 * Live chat room — a pod's or a club's: loads recent history, merges socket
 * updates (new messages / reactions / deletions), and exposes send, react and
 * delete. The server echoes sent messages over the socket, so we never
 * optimistically append — dedupe-by-id keeps the list clean. RN twin of mWeb's
 * ChatRoomPage + useChatRoomSource.
 */
export function useChatRoom(roomId: string, kind: ChatRoomKind = 'POD') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [facts, setFacts] = useState<RoomFacts>(NO_FACTS);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadRoom(kind, roomId)
      .then((room) => {
        if (!active) return;
        setMessages(room.messages);
        setFacts(room.facts);
      })
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load messages.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [roomId, kind, attempt]);

  useRefreshRegistration(refetch);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const applyReaction = useCallback((msg: Pick<ChatMessage, 'id' | 'reactions'>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)),
    );
  }, []);

  const markDeleted = useCallback((msg: Pick<ChatMessage, 'id'>) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted: true } : m)));
  }, []);

  usePodSocket({
    podId: roomId,
    kind,
    onMessage: appendMessage,
    onReaction: applyReaction,
    onDeleted: markDeleted,
    onError: setError,
  });

  const sendText = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body) return;
      try {
        await postTo(kind, roomId, PodMessageType.Text, body, null);
      } catch (e) {
        setError(toErrorMessage(e, 'Could not send message.'));
      }
    },
    [roomId, kind],
  );

  const sendImage = useCallback(
    async (asset: ChatImageAsset) => {
      if (!asset.base64) return;
      setSending(true);
      try {
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const fileName = asset.fileName ?? `chat-${Date.now()}.jpg`;
        const uploaded = await graphqlRequest(
          UploadImageDocument,
          {
            fileBase64: `data:${mimeType};base64,${asset.base64}`,
            fileName,
            mimeType,
            folder: '/chat',
          },
          { auth: true },
        );
        await postTo(kind, roomId, PodMessageType.Image, '', uploaded.uploadImageToImagekit.url);
      } catch (e) {
        setError(toErrorMessage(e, 'Could not send image.'));
      } finally {
        setSending(false);
      }
    },
    [roomId, kind],
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await graphqlRequest(
          ReactToPodMessageDocument,
          { messageId, emoji },
          { auth: true },
        );
        applyReaction(res.reactToPodMessage);
      } catch (e) {
        setError(toErrorMessage(e, 'Could not add reaction.'));
      }
    },
    [applyReaction],
  );

  /** Removes a message; `failedText` is the already-translated failure line. */
  const remove = useCallback(
    async (messageId: string, failedText: string) => {
      try {
        await graphqlRequest(DeleteChatMessageDocument, { messageId }, { auth: true });
        markDeleted({ id: messageId });
      } catch {
        setError(failedText);
      }
    },
    [markDeleted],
  );

  return {
    messages,
    podEnded: facts.closed,
    deletesAt: facts.deletesAt,
    retentionDays: facts.retentionDays,
    canModerate: facts.canModerate,
    roomTitle: facts.title,
    isLoading,
    sending,
    error,
    setError,
    sendText,
    sendImage,
    react,
    remove,
  };
}
