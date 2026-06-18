import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  CLAIM_SUPPORT_CHAT,
  CLOSE_SUPPORT_CHAT,
  MARK_SUPPORT_CHAT_READ,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  type SupportChatMessage,
  type SupportChatSession,
} from '../../graphql/supportChat';
import ChatMessages from './ChatMessages';
import CreateUserDialog from './CreateUserDialog';
import ChatComposer from './ChatComposer';
import SessionList from './SessionList';
import { useSupportSocket } from '../../lib/useSupportSocket';

const LIST_WIDTH = 200;

export default function LiveChatPage() {
  const sessionsQuery = useQuery<{ supportChatSessions: SupportChatSession[] }>(SUPPORT_CHAT_SESSIONS, {
    variables: { status: 'OPEN' },
    fetchPolicy: 'cache-and-network',
  });
  const sessions = sessionsQuery.data?.supportChatSessions ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [userTyping, setUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: selectedId, limit: 100 },
    skip: !selectedId,
    fetchPolicy: 'network-only',
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);
  const [claimChat] = useMutation(CLAIM_SUPPORT_CHAT);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  // Sessions that arrived live over the socket get highlighted until opened.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [closeChat] = useMutation(CLOSE_SUPPORT_CHAT, { onCompleted: () => sessionsQuery.refetch() });

  const socketRef = useSupportSocket({
    onChatSessionNew: (sess: SupportChatSession) => {
      if (sess?.id) setFreshIds((prev) => new Set(prev).add(sess.id));
      sessionsQuery.refetch();
    },
    onChatSessionUpdate: () => sessionsQuery.refetch(),
    onChatMessage: (m: SupportChatMessage) => {
      if (m.session_id !== selectedIdRef.current) return;
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      // The agent is viewing the thread, so mark a user reply read → blue tick.
      if (m.sender_role === 'USER') {
        markRead({ variables: { session_id: m.session_id } }).catch(() => undefined);
      }
    },
    onChatTyping: (p) => {
      if (p.session_id !== selectedIdRef.current) return;
      setUserTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setUserTyping(false), 2500);
    },
  });

  // Keep a ref of the selected id so the socket handler (registered once) reads
  // the latest value without re-subscribing.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (messagesQuery.data?.supportChatMessages) {
      setMessages(messagesQuery.data.supportChatMessages);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const selectSession = (id: string) => {
    if (id === selectedId) return;
    const prev = selectedId;
    setSelectedId(id);
    setMessages([]);
    const socket = socketRef.current;
    if (socket) {
      if (prev) socket.emit('leave_support_session', prev);
      socket.emit('join_support_session', id);
    }
    setFreshIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const session = sessions.find((x) => x.id === id);
    if (session && !session.agent_id) {
      claimChat({ variables: { session_id: id } }).catch(() => undefined);
    }
    markRead({ variables: { session_id: id } }).then(() => sessionsQuery.refetch());
  };

  const send = async () => {
    if (!selectedId || (!text.trim() && attachments.length === 0)) return;
    await sendMessage({
      variables: { session_id: selectedId, text: text.trim() || null, attachments },
    });
    setText('');
    setAttachments([]);
  };

  const selected = sessions.find((s) => s.id === selectedId);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100dvh - 150px)', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ width: LIST_WIDTH, flexShrink: 0, borderRight: 1, borderColor: 'divider', overflowY: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pr: 0.5 }}>
          <Typography variant="overline" sx={{ px: 1.5, pt: 1, display: 'block', fontWeight: 800 }}>
            Chat with Us
          </Typography>
          <IconButton size="small" aria-label="Create user account" onClick={() => setCreateUserOpen(true)}>
            <PersonAddAlt1Icon fontSize="small" />
          </IconButton>
        </Stack>
        <SessionList
          sessions={sessions}
          loading={sessionsQuery.loading}
          selectedId={selectedId}
          freshIds={freshIds}
          onSelect={selectSession}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Select a session to open the chat.</Typography>
          </Box>
        ) : (
          <>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}
            >
              <Avatar src={selected.user.avatar_url || undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
                {selected.user.name?.[0]?.toUpperCase() || '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                  {selected.user.name}
                </Typography>
                {selected.user.phone && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {selected.user.phone}
                  </Typography>
                )}
              </Box>
              <IconButton
                size="small"
                aria-label="Close chat"
                onClick={() => closeChat({ variables: { session_id: selected.id } })}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              <ChatMessages messages={messages} />
              {userTyping && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
                  {selected.user.name} is typing…
                </Typography>
              )}
            </Box>

            <Divider />
            <ChatComposer
              text={text}
              attachments={attachments}
              sending={sending}
              onText={setText}
              onAttachments={setAttachments}
              onSend={send}
              onTyping={() => {
                if (selectedId) socketRef.current?.emit('support_typing', selectedId);
              }}
            />
          </>
        )}
      </Box>
      <CreateUserDialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
    </Box>
  );
}
