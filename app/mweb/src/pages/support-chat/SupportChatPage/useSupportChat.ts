import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { canReopen, downloadBase64File, mergeReal, transcriptMime } from '../chatHelpers';
import { useSupportChatSocket, type TypingPayload } from '../useSupportChatSocket';
import {
  MARK_SUPPORT_CHAT_READ,
  MY_SUPPORT_CHAT,
  REOPEN_SUPPORT_CHAT,
  RESOLVE_SUPPORT_CHAT,
  SEND_SUPPORT_CHAT_MESSAGE,
  START_SUPPORT_CHAT,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_TRANSCRIPT,
  type SupportChatMessage,
  type SupportChatSession,
  type TranscriptFormat,
} from '../queries';

function optimistic(tempId: string, text: string, attachments: string[]): SupportChatMessage {
  return {
    id: tempId, session_id: 'temp', sender_id: 'me', sender_role: 'USER', sender_name: '',
    sender_photo: null, text, attachments, is_ai: false, created_at: new Date().toISOString(), pending: true,
  };
}

function typingLabel(t: TypingPayload | null): string | null {
  if (!t) return null;
  if (t.role === 'AGENT') return 'Support is typing…';
  return t.name ? `${t.name} is typing…` : 'Someone is typing…';
}

/** Owns the live support-chat session: messages, socket events and the send/resolve/reopen actions. */
export function useSupportChat() {
  const sessionQuery = useQuery<{ mySupportChat: SupportChatSession | null }>(MY_SUPPORT_CHAT, { fetchPolicy: 'cache-and-network' });
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const sessionId = session?.id ?? null;

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [typing, setTyping] = useState<TypingPayload | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: sessionId, limit: 100 }, skip: !sessionId, fetchPolicy: 'network-only',
  });
  const [startChat] = useMutation(START_SUPPORT_CHAT);
  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);
  const [resolveChat, { loading: resolving }] = useMutation(RESOLVE_SUPPORT_CHAT);
  const [reopenChat, { loading: reopening }] = useMutation(REOPEN_SUPPORT_CHAT);
  const [fetchTranscript] = useLazyQuery(SUPPORT_CHAT_TRANSCRIPT, { fetchPolicy: 'network-only' });

  const { emitTyping } = useSupportChatSocket({
    sessionId,
    onMessage: (m: SupportChatMessage) => {
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      if (m.sender_role !== 'USER') {
        setAiThinking(false);
        if (sessionId) markRead({ variables: { session_id: sessionId } });
      }
    },
    onSession: (s: SupportChatSession) => setSession((prev) => ({ ...prev, ...s })),
    onTyping: (payload) => {
      setTyping(payload);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(null), 2500);
    },
  });

  useEffect(() => { if (sessionQuery.data) setSession(sessionQuery.data.mySupportChat); }, [sessionQuery.data]);
  useEffect(() => { if (messagesQuery.data) setMessages(messagesQuery.data.supportChatMessages); }, [messagesQuery.data]);
  useEffect(() => { if (sessionId) markRead({ variables: { session_id: sessionId } }); }, [sessionId, markRead]);

  const deliver = useCallback(async (tempId: string, text: string, attachments: string[]) => {
    if (session?.ai_active !== false && !session?.agent_id) setAiThinking(true);
    try {
      if (sessionId) {
        const r = await sendMessage({ variables: { session_id: sessionId, text: text || null, attachments } });
        setMessages((prev) => mergeReal(prev, tempId, r.data.sendSupportChatMessage));
      } else {
        const r = await startChat({});
        const sid = r.data?.startSupportChat?.id;
        if (!sid) throw new Error('no session');
        await sendMessage({ variables: { session_id: sid, text: text || null, attachments } });
        await sessionQuery.refetch();
      }
    } catch {
      setAiThinking(false);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  }, [session?.ai_active, session?.agent_id, sessionId, startChat, sendMessage, sessionQuery]);

  const send = useCallback((text: string, attachments: string[]) => {
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, optimistic(tempId, text, attachments)]);
    deliver(tempId, text, attachments);
  }, [deliver]);

  const retry = useCallback((msg: SupportChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, failed: false, pending: true } : m)));
    deliver(msg.id, msg.text, msg.attachments);
  }, [deliver]);

  const resolve = useCallback(async () => {
    if (!sessionId) return;
    await resolveChat({ variables: { session_id: sessionId } });
    setSession((prev) => (prev ? { ...prev, status: 'CLOSED' } : prev));
  }, [sessionId, resolveChat]);

  const reopen = useCallback(async (reason: string) => {
    if (!sessionId) throw new Error('no session');
    await reopenChat({ variables: { session_id: sessionId, reason: reason || null } });
    setSession((prev) => (prev ? { ...prev, status: 'OPEN' } : prev));
  }, [sessionId, reopenChat]);

  const download = useCallback(async (format: TranscriptFormat) => {
    if (!sessionId) return;
    const r = await fetchTranscript({ variables: { session_id: sessionId, format } });
    const t = r.data?.supportChatTranscript;
    if (t) downloadBase64File(t.filename, t.content_base64, transcriptMime(format));
  }, [sessionId, fetchTranscript]);

  const applyFeedback = useCallback((rating: number, comment: string) => {
    setSession((prev) => (prev ? { ...prev, rating, feedback_comment: comment || null } : prev));
  }, []);

  const closed = session?.status === 'CLOSED';
  const reopenable = !!closed && canReopen(session?.reopen_deadline);
  const typingText = aiThinking ? 'Duncit Assistant is typing…' : typingLabel(typing);

  return {
    session, sessionId, messages, loading: sessionQuery.loading && !session,
    closed, reopenable, typingText, resolving, reopening, sending,
    emitTyping, send, retry, resolve, reopen, download, applyFeedback,
  };
}
