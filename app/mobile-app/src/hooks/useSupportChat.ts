import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import * as FileSystem from 'expo-file-system/legacy';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import {
  EmailSupportChatTranscriptDocument,
  MarkSupportChatReadDocument,
  ReopenSupportChatDocument,
  ResolveSupportChatDocument,
  SendSupportChatMessageDocument,
  StartSupportChatDocument,
  SubmitSupportChatFeedbackDocument,
  SupportChatMessagesDocument,
  SupportChatTranscriptDocument,
} from '@/graphql/support-chat';
import { UploadImageDocument } from '@/graphql/status';
import { SupportChatSenderRole, SupportChatStatus } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { appendUnique, mergeReal } from '@/utils/support-chat';

export type SupportChatMessage = ResultOf<
  typeof SupportChatMessagesDocument
>['supportChatMessages'][number] & { pending?: boolean };
export type SupportChatSession = ResultOf<typeof StartSupportChatDocument>['startSupportChat'];

interface PickedAsset {
  base64?: string | null;
  uri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

/**
 * Chat with Us — opens (or reuses) the user's session, streams messages, shows
 * the agent's typing + read state, and supports resolve/reopen, feedback and a
 * server-generated transcript (download + email). mWeb twin of /support chat.
 */
export function useSupportChat() {
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = session?.id ?? '';

  const markRead = useCallback((id: string) => {
    graphqlRequest(MarkSupportChatReadDocument, { sessionId: id }, { auth: true }).catch(
      () => undefined,
    );
  }, []);

  // Boot: start/reuse the session, then pull history + mark read.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const started = await graphqlRequest(StartSupportChatDocument, {}, { auth: true });
        if (!active) return;
        setSession(started.startSupportChat);
        const id = started.startSupportChat.id;
        const data = await graphqlRequest(
          SupportChatMessagesDocument,
          { sessionId: id, limit: 100 },
          { auth: true },
        );
        if (!active) return;
        setMessages(data.supportChatMessages);
        markRead(id);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not open the chat.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [markRead]);

  // Live updates once the session is known.
  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    getAuthToken().then((token) => {
      if (cancelled || !token) return;
      const s = io(config.apiUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = s;
      s.on('connect', () => s.emit('join_support_session', sessionId));
      s.on('support_chat:message', (m: SupportChatMessage) => {
        if (m.session_id !== sessionId) return;
        setMessages((prev) => appendUnique(prev, m));
        if (m.sender_role !== 'USER') markRead(sessionId);
      });
      s.on('support_chat:session_update', (sess: SupportChatSession) => {
        if (sess.id === sessionId) setSession((prev) => ({ ...prev, ...sess }));
      });
      s.on('support_typing', (payload: { session_id: string }) => {
        if (payload?.session_id !== sessionId) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2500);
      });
    });
    return () => {
      cancelled = true;
      socketRef.current?.emit('leave_support_session', sessionId);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, markRead]);

  const emitTyping = useCallback(() => {
    if (sessionId) socketRef.current?.emit('support_typing', sessionId);
  }, [sessionId]);

  const send = useCallback(
    async (text: string, attachments: string[] = []) => {
      if (!sessionId || (!text.trim() && attachments.length === 0)) return;
      const tempId = `temp-${Date.now()}`;
      const optimistic: SupportChatMessage = {
        id: tempId,
        session_id: sessionId,
        sender_id: 'me',
        sender_role: SupportChatSenderRole.User,
        sender_name: '',
        sender_photo: null,
        text: text.trim(),
        attachments,
        is_ai: false,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const sent = await graphqlRequest(
          SendSupportChatMessageDocument,
          { sessionId, text: text.trim() || null, attachments },
          { auth: true },
        );
        setMessages((prev) =>
          mergeReal(prev, tempId, sent.sendSupportChatMessage as SupportChatMessage),
        );
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw e;
      }
    },
    [sessionId],
  );

  /** Uploads a picked image/video to ImageKit and returns its URL. */
  const uploadAttachment = useCallback(async (asset: PickedAsset) => {
    const mimeType = asset.mimeType ?? 'image/jpeg';
    let base64 = asset.base64 ?? null;
    if (!base64 && asset.uri) {
      base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    if (!base64) throw new Error('Could not read the selected file.');
    const uploaded = await graphqlRequest(
      UploadImageDocument,
      {
        fileBase64: `data:${mimeType};base64,${base64}`,
        fileName: asset.fileName ?? `chat-${Date.now()}`,
        mimeType,
        folder: '/support/chat',
      },
      { auth: true },
    );
    return uploaded.uploadImageToImagekit.url;
  }, []);

  const resolve = useCallback(async () => {
    if (!session) return;
    await graphqlRequest(ResolveSupportChatDocument, { sessionId: session.id }, { auth: true });
    setSession({ ...session, status: SupportChatStatus.Closed });
  }, [session]);

  const reopen = useCallback(async () => {
    if (!session) return;
    await graphqlRequest(ReopenSupportChatDocument, { sessionId: session.id }, { auth: true });
    setSession({ ...session, status: SupportChatStatus.Open });
  }, [session]);

  const submitFeedback = useCallback(
    async (rating: number, comment: string) => {
      if (!sessionId) return;
      await graphqlRequest(
        SubmitSupportChatFeedbackDocument,
        { sessionId, rating, comment: comment.trim() || null },
        { auth: true },
      );
    },
    [sessionId],
  );

  const getTranscript = useCallback(async () => {
    if (!sessionId) return null;
    const data = await graphqlRequest(SupportChatTranscriptDocument, { sessionId }, { auth: true });
    return data.supportChatTranscript;
  }, [sessionId]);

  const emailTranscript = useCallback(
    async (email: string) => {
      if (!sessionId) return;
      await graphqlRequest(
        EmailSupportChatTranscriptDocument,
        { sessionId, email: email.trim() },
        { auth: true },
      );
    },
    [sessionId],
  );

  return {
    session,
    sessionId,
    messages,
    isLoading,
    error,
    typing,
    send,
    uploadAttachment,
    emitTyping,
    resolve,
    reopen,
    submitFeedback,
    getTranscript,
    emailTranscript,
  };
}
