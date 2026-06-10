import { useCallback, useEffect, useState } from 'react';

import {
  PodMessagesDocument,
  ReactToPodMessageDocument,
  SendPodMessageDocument,
} from '@/graphql/chat';
import { UploadImageDocument } from '@/graphql/status';
import { PodMessageType } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { usePodSocket } from '@/hooks/usePodSocket';
import type { ChatMessage } from '@/hooks/useChat';
import { toErrorMessage } from '@/utils/errors';

export interface ChatImageAsset {
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

const MESSAGE_LIMIT = 80;

/**
 * Live pod chat room: loads recent history, merges socket updates (new
 * messages / reactions / deletions), and exposes send + react actions. The
 * server echoes sent messages over the socket, so we never optimistically
 * append — dedupe-by-id keeps the list clean. RN twin of mWeb's ChatRoomPage.
 */
export function useChatRoom(podId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(PodMessagesDocument, { podId, limit: MESSAGE_LIMIT }, { auth: true })
      .then((data) => active && setMessages(data.podMessages))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load messages.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const applyReaction = useCallback((msg: Pick<ChatMessage, 'id' | 'reactions'>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)),
    );
  }, []);

  const markDeleted = useCallback((msg: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted: true } : m)));
  }, []);

  usePodSocket({
    podId,
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
        await graphqlRequest(
          SendPodMessageDocument,
          { podId, type: PodMessageType.Text, text: body, imageUrl: null },
          { auth: true },
        );
      } catch (e) {
        setError(toErrorMessage(e, 'Could not send message.'));
      }
    },
    [podId],
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
        await graphqlRequest(
          SendPodMessageDocument,
          {
            podId,
            type: PodMessageType.Image,
            text: '',
            imageUrl: uploaded.uploadImageToImagekit.url,
          },
          { auth: true },
        );
      } catch (e) {
        setError(toErrorMessage(e, 'Could not send image.'));
      } finally {
        setSending(false);
      }
    },
    [podId],
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

  return { messages, isLoading, sending, error, setError, sendText, sendImage, react };
}
