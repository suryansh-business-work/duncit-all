import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
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
import {
  SupportChatSenderRole,
  SupportChatStatus,
  TranscriptFormat,
} from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { appendUnique, mergeReal } from '@/utils/support-chat';
import { typingLabel } from '@/utils/support-typing';

export type SupportChatMessage = ResultOf<
  typeof SupportChatMessagesDocument
>['supportChatMessages'][number] & { pending?: boolean; failed?: boolean };
export type SupportChatSession = ResultOf<typeof StartSupportChatDocument>['startSupportChat'];

/** The party currently typing, from the socket `support_typing` payload (B14a). */
interface TypingPayload {
  session_id: string;
  role?: 'USER' | 'AGENT' | null;
  name?: string | null;
}

interface PickedAsset {
  uri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

interface SupportSocketHandlers {
  onMessage: (m: SupportChatMessage) => void;
  onSessionUpdate: (s: SupportChatSession) => void;
  onTyping: (p: TypingPayload) => void;
}

/**
 * Open the live socket for a support session and wire its listeners. Lives at
 * module scope so the effect that calls it stays shallow (Sonar S2004).
 */
function connectSupportSocket(
  token: string,
  sessionId: string,
  handlers: SupportSocketHandlers,
): Socket {
  const s = io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  s.on('connect', () => s.emit('join_support_session', sessionId));
  s.on('support_chat:message', handlers.onMessage);
  s.on('support_chat:session_update', handlers.onSessionUpdate);
  s.on('support_typing', handlers.onTyping);
  return s;
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
  // The peer's "is typing…" label (B14a), '' when nobody is typing.
  const [typing, setTyping] = useState('');
  // The AI bot has no socket typing event, so we show "thinking" locally after
  // the user sends while the assistant is still fielding the chat.
  const [aiThinking, setAiThinking] = useState(false);
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
    const onMessage = (m: SupportChatMessage) => {
      if (m.session_id !== sessionId) return;
      setMessages((prev) => appendUnique(prev, m));
      if (m.sender_role !== 'USER') {
        setAiThinking(false);
        markRead(sessionId);
      }
    };
    const onSessionUpdate = (sess: SupportChatSession) => {
      if (sess.id === sessionId) setSession((prev) => ({ ...prev, ...sess }));
    };
    const onTyping = (payload: TypingPayload) => {
      if (payload?.session_id !== sessionId) return;
      setTyping(typingLabel(payload));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(''), 2500);
    };
    getAuthToken().then((token) => {
      if (cancelled || !token) return;
      socketRef.current = connectSupportSocket(token, sessionId, {
        onMessage,
        onSessionUpdate,
        onTyping,
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

  // Delivers an optimistic message to the server; on failure it is kept and
  // flagged `failed` so the user can retry it (B12) — never silently dropped.
  const deliver = useCallback(
    async (tempId: string, text: string, attachments: string[]) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: true, failed: false } : m)),
      );
      try {
        const sent = await graphqlRequest(
          SendSupportChatMessageDocument,
          { sessionId, text: text.trim() || null, attachments },
          { auth: true },
        );
        setMessages((prev) => mergeReal(prev, tempId, sent.sendSupportChatMessage));
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
        setAiThinking(false);
        throw e;
      }
    },
    [sessionId],
  );

  const send = useCallback(
    async (text: string, attachments: string[] = []) => {
      if (!session || (!text.trim() && attachments.length === 0)) return;
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
      // Show the assistant "thinking" while the AI still fields the chat.
      if (session.ai_active !== false && !session.agent_id) setAiThinking(true);
      await deliver(tempId, text, attachments);
    },
    [session, sessionId, deliver],
  );

  /** Re-send a failed message in place (B12) — reuses its optimistic row. */
  const retry = useCallback(
    async (message: SupportChatMessage) => {
      await deliver(message.id, message.text, message.attachments);
    },
    [deliver],
  );

  /** Uploads a picked image/video/document DIRECTLY to ImageKit (bypassing the
   * API's request-body size limit) and returns its hosted URL. */
  const uploadAttachment = useCallback(async (asset: PickedAsset) => {
    if (!asset.uri) throw new Error('Could not read the selected file.');
    return uploadToImagekitDirect(
      {
        uri: asset.uri,
        name: asset.fileName ?? `chat-${Date.now()}`,
        type: asset.mimeType ?? 'application/octet-stream',
      },
      '/support/chat',
    );
  }, []);

  const resolve = useCallback(async () => {
    if (!session) return;
    const { resolveSupportChat } = await graphqlRequest(
      ResolveSupportChatDocument,
      { sessionId: session.id },
      { auth: true },
    );
    setSession({
      ...session,
      status: SupportChatStatus.Closed,
      resolved_at: resolveSupportChat.resolved_at,
    });
  }, [session]);

  const reopen = useCallback(
    async (reason: string) => {
      if (!session) return;
      await graphqlRequest(
        ReopenSupportChatDocument,
        { sessionId: session.id, reason: reason.trim() || null },
        { auth: true },
      );
      setSession({ ...session, status: SupportChatStatus.Open });
    },
    [session],
  );

  const submitFeedback = useCallback(
    async (rating: number, comment: string) => {
      if (!session) return;
      const trimmed = comment.trim();
      await graphqlRequest(
        SubmitSupportChatFeedbackDocument,
        { sessionId: session.id, rating, comment: trimmed || null },
        { auth: true },
      );
      // Reflect the one-time rating locally so the form switches to read-only (B8).
      setSession({ ...session, rating, feedback_comment: trimmed || null });
    },
    [session],
  );

  const getTranscript = useCallback(
    async (format: TranscriptFormat = TranscriptFormat.Txt) => {
      if (!sessionId) return null;
      const data = await graphqlRequest(
        SupportChatTranscriptDocument,
        { sessionId, format },
        { auth: true },
      );
      return data.supportChatTranscript;
    },
    [sessionId],
  );

  const emailTranscript = useCallback(
    async (email: string) => {
      if (!sessionId) return;
      await graphqlRequest(
        EmailSupportChatTranscriptDocument,
        { sessionId, email: email.trim(), format: TranscriptFormat.Docx },
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
    aiThinking,
    send,
    retry,
    uploadAttachment,
    emitTyping,
    resolve,
    reopen,
    submitFeedback,
    getTranscript,
    emailTranscript,
  };
}
