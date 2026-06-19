import { useEffect, useRef, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Fab, Paper, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChatHeader from './ChatHeader';
import ChatBubble from './ChatBubble';
import ChatComposer from './ChatComposer';
import FeedbackDialog from './FeedbackDialog';
import EmailTranscriptDialog from './EmailTranscriptDialog';
import { dayLabel, downloadBase64Text, mergeReal, showDaySeparator } from './chatHelpers';
import { useSupportChatSocket } from './useSupportChatSocket';
import {
  EMAIL_SUPPORT_CHAT_TRANSCRIPT,
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
} from './queries';

function optimistic(tempId: string, text: string, attachments: string[]): SupportChatMessage {
  return {
    id: tempId, session_id: 'temp', sender_id: 'me', sender_role: 'USER', sender_name: '',
    sender_photo: null, text, attachments, is_ai: false, created_at: new Date().toISOString(), pending: true,
  };
}

export default function SupportChatPage() {
  const navigate = useNavigate();
  const sessionQuery = useQuery<{ mySupportChat: SupportChatSession | null }>(MY_SUPPORT_CHAT, { fetchPolicy: 'cache-and-network' });
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const sessionId = session?.id ?? null;

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  // True while the AI assistant is generating its reply (no socket typing event
  // is emitted for the bot, so we drive it locally after the user sends).
  const [aiThinking, setAiThinking] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: sessionId, limit: 100 }, skip: !sessionId, fetchPolicy: 'network-only',
  });
  const [startChat] = useMutation(START_SUPPORT_CHAT);
  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);
  const [resolveChat] = useMutation(RESOLVE_SUPPORT_CHAT);
  const [reopenChat] = useMutation(REOPEN_SUPPORT_CHAT);
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
    onTyping: () => {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 2500);
    },
  });

  useEffect(() => { if (sessionQuery.data) setSession(sessionQuery.data.mySupportChat); }, [sessionQuery.data]);
  useEffect(() => { if (messagesQuery.data) setMessages(messagesQuery.data.supportChatMessages); }, [messagesQuery.data]);
  useEffect(() => { if (sessionId) markRead({ variables: { session_id: sessionId } }); }, [sessionId, markRead]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, typing, aiThinking]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 160);
  };
  const jumpToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  const send = async (text: string, attachments: string[]) => {
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, optimistic(tempId, text, attachments)]);
    // Show the assistant "thinking" while the AI fields the chat (no agent yet).
    if (session?.ai_active !== false && !session?.agent_id) setAiThinking(true);
    try {
      if (!sessionId) {
        const r = await startChat({});
        const sid = r.data?.startSupportChat?.id;
        if (!sid) throw new Error('no session');
        await sendMessage({ variables: { session_id: sid, text: text || null, attachments } });
        await sessionQuery.refetch();
      } else {
        const r = await sendMessage({ variables: { session_id: sessionId, text: text || null, attachments } });
        setMessages((prev) => mergeReal(prev, tempId, r.data.sendSupportChatMessage));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const onResolve = async () => {
    if (!sessionId) return;
    await resolveChat({ variables: { session_id: sessionId } });
    setSession((prev) => (prev ? { ...prev, status: 'CLOSED' } : prev));
    setFeedbackOpen(true);
  };
  const onReopen = async () => {
    if (!sessionId) return;
    await reopenChat({ variables: { session_id: sessionId } });
    setSession((prev) => (prev ? { ...prev, status: 'OPEN' } : prev));
  };
  const onDownload = async () => {
    if (!sessionId) return;
    const r = await fetchTranscript({ variables: { session_id: sessionId } });
    const t = r.data?.supportChatTranscript;
    if (t) downloadBase64Text(t.filename, t.content_base64);
  };

  const loading = sessionQuery.loading && !session;

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100dvh - 120px)', position: 'relative' }}>
      <ChatHeader
        ticketNo={session?.ticket_no ?? null}
        status={session?.status ?? null}
        onBack={() => navigate('/support')}
        onResolve={onResolve}
        onReopen={onReopen}
        onDownload={onDownload}
        onEmail={() => setEmailOpen(true)}
      />

      <Box ref={scrollRef} onScroll={onScroll} sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            Start a conversation — our assistant replies instantly and connects you to a human when needed.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {messages.map((m, i) => (
              <Box key={m.id}>
                {showDaySeparator(m.created_at, messages[i - 1]?.created_at) && (
                  <Stack alignItems="center" sx={{ my: 0.5 }}>
                    <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, borderRadius: 99, fontWeight: 700 }}>
                      {dayLabel(m.created_at)}
                    </Typography>
                  </Stack>
                )}
                <ChatBubble msg={m} agentLastReadAt={session?.agent_last_read_at ?? null} />
              </Box>
            ))}
            {(typing || aiThinking) && (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontStyle: 'italic' }}>
                {aiThinking ? 'Duncit Assistant is typing…' : 'Support is typing…'}
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      {showJump && (
        <Fab size="small" color="primary" aria-label="Jump to latest" onClick={jumpToBottom} sx={{ position: 'absolute', right: 12, bottom: 76 }}>
          <KeyboardArrowDownIcon />
        </Fab>
      )}

      {session?.status === 'CLOSED' && (
        <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            This chat is resolved — send a message or re-open it if you still need help.
          </Typography>
        </Paper>
      )}

      <ChatComposer disabled={sending} onSend={send} onTyping={emitTyping} />

      {sessionId && (
        <>
          <FeedbackDialog open={feedbackOpen} sessionId={sessionId} onClose={() => setFeedbackOpen(false)} onSubmitted={() => setFeedbackOpen(false)} />
          <EmailTranscriptDialog open={emailOpen} sessionId={sessionId} onClose={() => setEmailOpen(false)} />
        </>
      )}
    </Stack>
  );
}
