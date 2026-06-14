import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import {
  MarkSupportChatReadDocument,
  SendSupportChatMessageDocument,
  StartSupportChatDocument,
  SupportChatMessagesDocument,
} from '@/graphql/support-chat';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

export type SupportChatMessage = ResultOf<
  typeof SupportChatMessagesDocument
>['supportChatMessages'][number];

interface SocketHandlers {
  onMessage: (msg: SupportChatMessage) => void;
}

/** Connects + joins the support session room; forwards live chat messages. */
function createSupportSocket(
  token: string,
  sessionId: string,
  handlers: { current: SocketHandlers },
): Socket {
  const s = io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    // Fall back to long-polling when WebSockets are blocked (some mobile/captive
    // networks) instead of failing to connect. Mirrors mWeb's socket setup.
    transports: ['websocket', 'polling'],
  });
  s.on('connect', () => {
    s.emit('join_support_session', sessionId);
  });
  s.on('support_chat:message', (msg: SupportChatMessage) => {
    if (msg.session_id === sessionId) handlers.current.onMessage(msg);
  });
  return s;
}

/**
 * Chat with Us — opens (or reuses) the user's support session, loads history,
 * streams new messages over the socket, and sends text/image messages.
 */
export function useSupportChat() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handlersRef = useRef<SocketHandlers>({
    onMessage: (msg) =>
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])),
  });

  // Boot: start/reuse the session, then pull history + mark read.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const started = await graphqlRequest(StartSupportChatDocument, {}, { auth: true });
        const id = started.startSupportChat.id;
        if (!active) return;
        setSessionId(id);
        const data = await graphqlRequest(
          SupportChatMessagesDocument,
          { sessionId: id, limit: 100 },
          { auth: true },
        );
        if (!active) return;
        setMessages(data.supportChatMessages);
        graphqlRequest(MarkSupportChatReadDocument, { sessionId: id }, { auth: true }).catch(
          () => undefined,
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not open the chat.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live updates once the session is known.
  useEffect(() => {
    if (!sessionId) return undefined;
    let socket: Socket | null = null;
    let cancelled = false;
    getAuthToken().then((token) => {
      if (cancelled || !token) return;
      socket = createSupportSocket(token, sessionId, handlersRef);
    });
    return () => {
      cancelled = true;
      socket?.emit('leave_support_session', sessionId);
      socket?.disconnect();
    };
  }, [sessionId]);

  const send = useCallback(
    async (text: string, attachments: string[] = []) => {
      if (!sessionId || (!text.trim() && attachments.length === 0)) return;
      const sent = await graphqlRequest(
        SendSupportChatMessageDocument,
        { sessionId, text: text.trim() || null, attachments },
        { auth: true },
      );
      const msg = sent.sendSupportChatMessage as SupportChatMessage;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    },
    [sessionId],
  );

  /** Uploads a picked image to ImageKit and returns its URL for an attachment. */
  const uploadImage = useCallback(
    async (asset: {
      base64?: string | null;
      fileName?: string | null;
      mimeType?: string | null;
    }) => {
      if (!asset.base64) throw new Error('No image selected.');
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const uploaded = await graphqlRequest(
        UploadImageDocument,
        {
          fileBase64: `data:${mimeType};base64,${asset.base64}`,
          fileName: asset.fileName ?? `chat-${Date.now()}.jpg`,
          mimeType,
          folder: '/support/chat',
        },
        { auth: true },
      );
      return uploaded.uploadImageToImagekit.url;
    },
    [],
  );

  return { sessionId, messages, isLoading, error, send, uploadImage };
}
