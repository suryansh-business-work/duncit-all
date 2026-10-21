import { useCallback, useEffect, useState } from 'react';
import { CHAT_HISTORY_PAGE } from '@duncit/utils';

import {
  ClubMessagesDocument,
  ClubMessagesPageDocument,
  DeleteChatMessageDocument,
  PodMessagesDocument,
  PodMessagesPageDocument,
  ReactToPodMessageDocument,
  SendClubMessageDocument,
  SendPodMessageDocument,
} from '@/graphql/chat';
import { UploadImageDocument } from '@/graphql/status';
import { PodMessageType } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { usePodSocket, type ChatRoomKind } from '@/hooks/usePodSocket';
import type { ChatMessage } from '@/hooks/useChat';
import { useChatHistory } from '@/hooks/useChatHistory';
import type { MuteFields } from '@/hooks/useChatMute';
import { useMarkChatRead } from '@/hooks/useMarkChatRead';
import { pingForMessage } from '@/services/chat-sound';
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
  /** The pod's title or the club's name, for the header. */
  title: string | null;
  /** The viewer's mute of this room. */
  mute: MuteFields | null;
}

const NO_FACTS: RoomFacts = {
  closed: false,
  deletesAt: null,
  retentionDays: null,
  canModerate: false,
  title: null,
  mute: null,
};

/** What a send carries beyond the line itself. */
export interface ChatSendExtras {
  replyToId?: string | null;
  mentions?: string[];
}

/** Who is reading and whether the room is muted — read when a line arrives. */
export interface RoomReader {
  meId?: string | null;
  muted?: boolean;
}

const NO_READER: { readonly current: RoomReader } = { current: {} };

/** The newest page of a pod's or a club's room, with what the room says about itself. */
async function loadRoom(kind: ChatRoomKind, id: string) {
  if (kind === 'POD') {
    const data = await graphqlRequest(
      PodMessagesDocument,
      { podId: id, limit: CHAT_HISTORY_PAGE },
      { auth: true },
    );
    const ended = !isPodActive(data.pod?.pod_date_time, data.pod?.pod_end_date_time);
    return {
      messages: data.podMessages,
      facts: {
        ...NO_FACTS,
        // The server's word first; the dates are the fallback.
        closed: data.podChatInfo.closed || ended,
        deletesAt: data.podChatInfo.chat_deletes_at ?? null,
        canModerate: data.podChatInfo.can_moderate,
        title: data.pod?.pod_title ?? null,
        mute: data.podChatInfo,
      },
    };
  }
  const data = await graphqlRequest(
    ClubMessagesDocument,
    { clubId: id, limit: CHAT_HISTORY_PAGE },
    { auth: true },
  );
  return {
    messages: data.clubMessages,
    facts: {
      ...NO_FACTS,
      retentionDays: data.clubChatRoom.retention_days,
      canModerate: data.clubChatRoom.can_moderate,
      title: data.clubChatRoom.club_name,
      mute: data.clubChatRoom,
    },
  };
}

/** The page of a room's lines older than `before` — scroll-up history. */
async function loadOlderPage(kind: ChatRoomKind, id: string, before: string) {
  if (kind === 'POD') {
    const data = await graphqlRequest(
      PodMessagesPageDocument,
      { podId: id, limit: CHAT_HISTORY_PAGE, before },
      { auth: true },
    );
    return data.podMessages;
  }
  const data = await graphqlRequest(
    ClubMessagesPageDocument,
    { clubId: id, limit: CHAT_HISTORY_PAGE, before },
    { auth: true },
  );
  return data.clubMessages;
}

const messageTime = (message: ChatMessage) => message.createdAt;

/** Uploads a picked photo to the chat folder and answers its URL — shared by
 * every room that sends photos (the group chats and the venue thread). */
export async function uploadChatImage(asset: ChatImageAsset & { base64: string }): Promise<string> {
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
  return uploaded.uploadImageToImagekit.url;
}

/** Posts one line to the room — the server echoes it over the socket. */
function postTo(
  kind: ChatRoomKind,
  id: string,
  type: PodMessageType,
  text: string,
  imageUrl: string | null,
  extras: ChatSendExtras = {},
) {
  const line = {
    type,
    text,
    imageUrl,
    replyToId: extras.replyToId ?? null,
    mentions: extras.mentions ?? [],
  };
  return kind === 'POD'
    ? graphqlRequest(SendPodMessageDocument, { podId: id, ...line }, { auth: true })
    : graphqlRequest(SendClubMessageDocument, { clubId: id, ...line }, { auth: true });
}

/**
 * Live chat room — a pod's or a club's: loads recent history, merges socket
 * updates (new messages / reactions / deletions), and exposes send, react and
 * delete. The server echoes sent messages over the socket, so we never
 * optimistically append — dedupe-by-id keeps the list clean. RN twin of mWeb's
 * ChatRoomPage + useChatRoomSource.
 */
export function useChatRoom(
  roomId: string,
  kind: ChatRoomKind = 'POD',
  /** Read when a line arrives, so the socket never reconnects when it changes —
   * the screen fills it once it knows who is reading and the room's mute. */
  reader: { readonly current: RoomReader } = NO_READER,
) {
  const markRead = useMarkChatRead(kind, roomId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [facts, setFacts] = useState<RoomFacts>(NO_FACTS);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  const fetchOlder = useCallback(
    (before: string) => loadOlderPage(kind, roomId, before),
    [kind, roomId],
  );
  const history = useChatHistory({ messages, setMessages, fetchOlder, timeOf: messageTime });
  const { startHistory } = history;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadRoom(kind, roomId)
      .then((room) => {
        if (!active) return;
        setMessages(room.messages);
        setFacts(room.facts);
        startHistory(room.messages.length);
      })
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load messages.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [roomId, kind, attempt, startHistory]);

  useRefreshRegistration(refetch);

  // A line from someone else, while the room is open: ping (one per burst,
  // never in a muted room) and mark the room read — the reader is looking at it.
  const appendMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.user_id === reader.current.meId) return;
      if (!reader.current.muted) pingForMessage(msg.id);
      markRead();
    },
    [markRead, reader],
  );

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

  /** Sends a line, with what it replies to and who it mentions; true once sent. */
  const sendText = useCallback(
    async (text: string, extras: ChatSendExtras = {}) => {
      const body = text.trim();
      if (!body) return false;
      try {
        await postTo(kind, roomId, PodMessageType.Text, body, null, extras);
        return true;
      } catch (e) {
        setError(toErrorMessage(e, 'Could not send message.'));
        return false;
      }
    },
    [roomId, kind],
  );

  const sendImage = useCallback(
    async (asset: ChatImageAsset) => {
      const { base64 } = asset;
      if (!base64) return;
      setSending(true);
      try {
        const url = await uploadChatImage({ ...asset, base64 });
        await postTo(kind, roomId, PodMessageType.Image, '', url);
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
    mute: facts.mute,
    isLoading,
    history,
    sending,
    error,
    setError,
    sendText,
    sendImage,
    react,
    remove,
  };
}
