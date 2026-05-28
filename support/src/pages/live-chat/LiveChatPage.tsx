import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import {
  CLOSE_SUPPORT_CHAT,
  MARK_SUPPORT_CHAT_READ,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  type SupportChatMessage,
  type SupportChatSession,
} from '../../graphql/supportChat';
import UploadField from '../../components/UploadField';
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: selectedId, limit: 100 },
    skip: !selectedId,
    fetchPolicy: 'network-only',
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);
  const [closeChat] = useMutation(CLOSE_SUPPORT_CHAT, { onCompleted: () => sessionsQuery.refetch() });

  const socketRef = useSupportSocket({
    onChatSessionNew: () => sessionsQuery.refetch(),
    onChatSessionUpdate: () => sessionsQuery.refetch(),
    onChatMessage: (m: SupportChatMessage) => {
      setMessages((prev) => {
        if (m.session_id !== selectedIdRef.current) return prev;
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, m];
      });
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
        <Typography variant="overline" sx={{ px: 1.5, pt: 1, display: 'block', fontWeight: 800 }}>
          Sessions
        </Typography>
        {sessionsQuery.loading && !sessions.length ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        ) : !sessions.length ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>
            No open chats.
          </Typography>
        ) : (
          <List dense sx={{ py: 0 }}>
            {sessions.map((s) => (
              <ListItemButton
                key={s.id}
                selected={s.id === selectedId}
                onClick={() => selectSession(s.id)}
                sx={{ alignItems: 'flex-start' }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Badge color="error" badgeContent={s.unread_for_agent} max={9}>
                    <Avatar src={s.user.avatar_url || undefined} sx={{ width: 30, height: 30, fontSize: 13 }}>
                      {s.user.name?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={s.user.name}
                  secondary={s.last_message_preview}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
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
              <Stack spacing={1.25}>
                {messages.map((m) => {
                  const isAgent = m.sender_role === 'AGENT';
                  return (
                    <Stack
                      key={m.id}
                      direction="row"
                      sx={{ justifyContent: isAgent ? 'flex-end' : 'flex-start' }}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          px: 1.25,
                          maxWidth: '70%',
                          bgcolor: isAgent ? 'primary.main' : 'background.paper',
                          color: isAgent ? 'primary.contrastText' : 'text.primary',
                          borderColor: isAgent ? 'primary.main' : 'divider',
                        }}
                      >
                        {m.text && <Typography variant="body2">{m.text}</Typography>}
                        {m.attachments.length > 0 && (
                          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5, mt: m.text ? 0.5 : 0 }}>
                            {m.attachments.map((url, i) => (
                              <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                                <Avatar variant="rounded" src={url} sx={{ width: 52, height: 52 }} />
                              </a>
                            ))}
                          </Stack>
                        )}
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.25 }}>
                          {format(new Date(m.created_at), 'HH:mm')}
                        </Typography>
                      </Paper>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>

            <Divider />
            <Stack spacing={1} sx={{ p: 1.5 }}>
              <UploadField value={attachments} onChange={setAttachments} folder="/support/chat" label="Attach" max={3} />
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={sending || (!text.trim() && attachments.length === 0)}
                  onClick={send}
                >
                  Send
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
