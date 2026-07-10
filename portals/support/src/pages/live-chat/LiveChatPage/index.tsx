import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Snackbar } from '@mui/material';
import {
  CLAIM_SUPPORT_CHAT,
  MARK_SUPPORT_CHAT_READ,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  type SupportChatMessage,
  type SupportChatSession,
  type SupportChatSessionPage,
  type SupportChatStatus,
} from '../../../graphql/supportChat';
import { useSupportSocket, type ChatTypingPayload } from '../../../lib/useSupportSocket';
import CreateUserDialog from '../CreateUserDialog';
import SessionInbox from './SessionInbox';
import ChatPane from './ChatPane';
import { useChatActions } from './useChatActions';

function typingLabelFor(p: ChatTypingPayload, fallbackName: string): string {
  if (p.role === 'AGENT') return 'Support is typing…';
  return `${p.name || fallbackName} is typing…`;
}

export default function LiveChatPage() {
  const [statusFilter, setStatusFilter] = useState<SupportChatStatus>('OPEN');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sessionsQuery = useQuery<{ supportChatSessions: SupportChatSessionPage }>(SUPPORT_CHAT_SESSIONS, {
    variables: {
      status: statusFilter,
      search: search || null,
      page: page + 1,
      page_size: pageSize,
    },
    fetchPolicy: 'cache-and-network',
  });
  const sessions = sessionsQuery.data?.supportChatSessions.items ?? [];
  const totalSessions = sessionsQuery.data?.supportChatSessions.total ?? 0;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: selectedId, limit: 100 },
    skip: !selectedId,
    fetchPolicy: 'network-only',
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);
  const [claimChat] = useMutation(CLAIM_SUPPORT_CHAT);
  const actions = useChatActions(() => sessionsQuery.refetch());

  const socketRef = useSupportSocket({
    onChatSessionNew: (sess: SupportChatSession) => {
      if (sess?.id) setFreshIds((prev) => new Set(prev).add(sess.id));
      sessionsQuery.refetch();
    },
    onChatSessionUpdate: () => sessionsQuery.refetch(),
    onChatMessage: (m: SupportChatMessage) => {
      if (m.session_id !== selectedIdRef.current) return;
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      if (m.sender_role === 'USER') {
        markRead({ variables: { session_id: m.session_id } }).catch(() => undefined);
      }
    },
    onChatTyping: (p: ChatTypingPayload) => {
      if (p.session_id !== selectedIdRef.current) return;
      const selected = sessions.find((s) => s.id === p.session_id);
      setTypingLabel(typingLabelFor(p, selected?.user.name ?? 'User'));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingLabel(null), 2500);
    },
  });

  useEffect(() => {
    if (messagesQuery.data?.supportChatMessages) setMessages(messagesQuery.data.supportChatMessages);
  }, [messagesQuery.data]);

  const selectSession = (id: string) => {
    if (id === selectedId) return;
    const prev = selectedId;
    setSelectedId(id);
    setMessages([]);
    setTypingLabel(null);
    const socket = socketRef.current;
    if (socket) {
      if (prev) socket.emit('leave_support_session', prev);
      socket.emit('join_support_session', id);
    }
    setFreshIds((prev2) => {
      const next = new Set(prev2);
      next.delete(id);
      return next;
    });
    const session = sessions.find((x) => x.id === id);
    if (session && !session.agent_id && session.status !== 'CLOSED') {
      claimChat({ variables: { session_id: id } }).catch(() => undefined);
    }
    markRead({ variables: { session_id: id } }).then(() => sessionsQuery.refetch());
  };

  const send = async () => {
    if (!selectedId || (!text.trim() && attachments.length === 0)) return;
    await sendMessage({ variables: { session_id: selectedId, text: text.trim() || null, attachments } });
    setText('');
    setAttachments([]);
  };

  const selected = sessions.find((s) => s.id === selectedId);
  const emptyLabel = statusFilter === 'OPEN' ? 'No open chats.' : 'No resolved chats.';

  return (
    <Box sx={{ display: 'flex', height: 'calc(100dvh - 150px)', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <SessionInbox
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sessions={sessions}
        loading={sessionsQuery.loading}
        selectedId={selectedId}
        freshIds={freshIds}
        emptyLabel={emptyLabel}
        onSelect={selectSession}
        page={page}
        pageSize={pageSize}
        total={totalSessions}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        onCreateUser={() => setCreateUserOpen(true)}
      />

      <ChatPane
        selected={selected}
        busy={messagesQuery.loading}
        messages={messages}
        typingLabel={typingLabel}
        text={text}
        attachments={attachments}
        sending={sending}
        onResolve={() => {
          if (selected) actions.resolve(selected.id);
        }}
        onReopen={() => {
          if (selected) actions.reopen(selected.id);
        }}
        onDownload={(format) => {
          if (selected) actions.download(selected.id, format);
        }}
        onEmail={(email) => {
          if (selected) actions.email(selected.id, email);
        }}
        onText={setText}
        onAttachments={setAttachments}
        onSend={send}
        onTyping={() => {
          if (selectedId) socketRef.current?.emit('support_typing', selectedId);
        }}
      />

      <CreateUserDialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
      <Snackbar
        open={Boolean(actions.notice)}
        autoHideDuration={4000}
        onClose={actions.clearNotice}
        message={actions.notice}
      />
    </Box>
  );
}
