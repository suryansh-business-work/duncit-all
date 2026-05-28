import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { format } from 'date-fns';
import {
  MARK_SUPPORT_CHAT_READ,
  MY_SUPPORT_CHAT,
  SEND_SUPPORT_CHAT_MESSAGE,
  START_SUPPORT_CHAT,
  SUPPORT_CHAT_MESSAGES,
  type SupportChatMessage,
} from './queries';
import { useSupportChatSocket } from './useSupportChatSocket';

export default function SupportChatPage() {
  const myChat = useQuery<{ mySupportChat: { id: string; status: string } | null }>(MY_SUPPORT_CHAT, {
    fetchPolicy: 'cache-and-network',
  });
  const sessionId = myChat.data?.mySupportChat?.id ?? null;

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messagesQuery = useQuery<{ supportChatMessages: SupportChatMessage[] }>(SUPPORT_CHAT_MESSAGES, {
    variables: { session_id: sessionId, limit: 100 },
    skip: !sessionId,
    fetchPolicy: 'network-only',
  });

  const [startChat] = useMutation(START_SUPPORT_CHAT);
  const [sendMessage, { loading: sending }] = useMutation(SEND_SUPPORT_CHAT_MESSAGE);
  const [markRead] = useMutation(MARK_SUPPORT_CHAT_READ);

  useSupportChatSocket({
    sessionId,
    onMessage: (m: SupportChatMessage) =>
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m])),
  });

  useEffect(() => {
    if (messagesQuery.data?.supportChatMessages) {
      setMessages(messagesQuery.data.supportChatMessages);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    if (sessionId) markRead({ variables: { session_id: sessionId } });
  }, [sessionId, markRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    if (!sessionId) {
      await startChat({ variables: { text: body } });
      await myChat.refetch();
      await messagesQuery.refetch();
    } else {
      await sendMessage({ variables: { session_id: sessionId, text: body } });
      await messagesQuery.refetch();
    }
  };

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100dvh - 150px)' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <SupportAgentIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 800, flex: 1 }}>
          Live Chat
        </Typography>
      </Stack>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
        {myChat.loading && !sessionId ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : !messages.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            Start a conversation with our support team.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {messages.map((m) => {
              const isUser = m.sender_role === 'USER';
              return (
                <Stack key={m.id} direction="row" sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }} spacing={1}>
                  {!isUser && (
                    <Avatar src={m.sender_photo || undefined} sx={{ width: 26, height: 26, fontSize: 12 }}>
                      {m.sender_name?.[0]?.toUpperCase() || 'S'}
                    </Avatar>
                  )}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      px: 1.25,
                      maxWidth: '70%',
                      bgcolor: isUser ? 'primary.main' : 'background.paper',
                      color: isUser ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    {m.text && <Typography variant="body2">{m.text}</Typography>}
                    {m.attachments.length > 0 && (
                      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5, mt: m.text ? 0.5 : 0 }}>
                        {m.attachments.map((url, i) => (
                          <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                            <Avatar variant="rounded" src={url} sx={{ width: 48, height: 48 }} />
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
        )}
      </Box>

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
        <Button variant="contained" endIcon={<SendIcon />} disabled={sending || !text.trim()} onClick={send}>
          Send
        </Button>
      </Stack>
    </Stack>
  );
}
