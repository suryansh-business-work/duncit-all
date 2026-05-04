import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { io, Socket } from 'socket.io-client';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  Tooltip,
  Popover,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import MediaPickerDialog from '../components/MediaPickerDialog';

const POD_MESSAGES = gql`
  query PodMessages($pod_id: ID!, $limit: Int) {
    me {
      user_id
    }
    podMessages(pod_id: $pod_id, limit: $limit) {
      id
      pod_id
      user_id
      user_name
      user_photo
      type
      text
      image_url
      reactions {
        user_id
        emoji
      }
      deleted
      createdAt
    }
    pod(pod_doc_id: $pod_id) {
      id
      pod_title
    }
  }
`;
const SEND_MSG = gql`
  mutation Send($pod_id: ID!, $type: PodMessageType, $text: String, $image_url: String) {
    sendPodMessage(pod_id: $pod_id, type: $type, text: $text, image_url: $image_url) {
      id
    }
  }
`;
const REACT_MSG = gql`
  mutation React($message_id: ID!, $emoji: String!) {
    reactToPodMessage(message_id: $message_id, emoji: $emoji) {
      id
      reactions {
        user_id
        emoji
      }
    }
  }
`;

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😢', '🙏', '😮'];

function getSocketUrl() {
  const apiBase: string =
    (import.meta as any).env?.VITE_GRAPHQL_URL ||
    (import.meta as any).env?.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:2001/graphql`;
  try {
    const u = new URL(apiBase);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
}

export default function ChatRoomPage() {
  const { id: podId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery(POD_MESSAGES, {
    variables: { pod_id: podId, limit: 80 },
    fetchPolicy: 'cache-and-network',
  });
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [reactAnchor, setReactAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [send] = useMutation(SEND_MSG);
  const [react] = useMutation(REACT_MSG);
  const [live, setLive] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myId = data?.me?.user_id;
  const messages = useMemo(() => {
    const initial = data?.podMessages ?? [];
    const merged = [...initial];
    const ids = new Set(initial.map((m: any) => m.id));
    for (const m of live) if (!ids.has(m.id)) merged.push(m);
    return merged;
  }, [data, live]);

  useEffect(() => {
    if (!podId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    s.on('connect', () => {
      s.emit('join_pod', podId, (ok: boolean, err?: string) => {
        if (!ok) setError(err || 'Cannot join chat');
      });
    });
    s.on('message', (msg: any) => {
      if (msg.pod_id === podId) setLive((p) => [...p, msg]);
    });
    s.on('reaction', (msg: any) => {
      if (msg.pod_id === podId) {
        setLive((p) => p.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)));
        refetch();
      }
    });
    s.on('deleted', () => refetch());
    s.on('connect_error', (e: any) => setError(e?.message || 'Socket error'));
    return () => {
      s.emit('leave_pod', podId);
      s.disconnect();
    };
  }, [podId, refetch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const submit = async (overrideImage?: string) => {
    const t = text.trim();
    if (!t && !overrideImage) return;
    try {
      await send({
        variables: {
          pod_id: podId,
          type: overrideImage ? 'IMAGE' : 'TEXT',
          text: overrideImage ? '' : t,
          image_url: overrideImage || null,
        },
      });
      setText('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const insertEmoji = (e: string) => {
    setText((p) => p + e);
    setEmojiAnchor(null);
  };

  const onReact = async (emoji: string) => {
    if (!reactAnchor) return;
    try {
      await react({ variables: { message_id: reactAnchor.id, emoji } });
    } catch (err: any) {
      setError(err.message);
    }
    setReactAnchor(null);
  };

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={() => navigate('/chats')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {data?.pod?.pod_title || 'Chat'}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 1, bgcolor: 'background.default' }}>
        {messages.map((m: any) => {
          const mine = String(m.user_id) === String(myId);
          return (
            <Stack
              key={m.id}
              direction="row"
              spacing={1}
              sx={{ mb: 1, justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              {!mine && (
                <Avatar src={m.user_photo || undefined} sx={{ width: 32, height: 32 }}>
                  {(m.user_name || '?').charAt(0)}
                </Avatar>
              )}
              <Paper
                onDoubleClick={(e) => setReactAnchor({ el: e.currentTarget, id: m.id })}
                sx={{
                  p: 1,
                  px: 1.5,
                  maxWidth: '78%',
                  bgcolor: mine ? 'primary.main' : 'background.paper',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                {!mine && (
                  <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7, display: 'block' }}>
                    {m.user_name || 'User'}
                  </Typography>
                )}
                {m.deleted ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                    deleted
                  </Typography>
                ) : m.type === 'IMAGE' ? (
                  <Box
                    component="img"
                    src={m.image_url}
                    alt=""
                    sx={{ maxWidth: 240, maxHeight: 240, borderRadius: 1, display: 'block' }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.text}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                {m.reactions?.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(
                      m.reactions.reduce((acc: any, r: any) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <Box
                        key={emoji}
                        sx={{
                          fontSize: 12,
                          bgcolor: 'rgba(0,0,0,0.1)',
                          color: mine ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 5,
                          px: 0.75,
                        }}
                      >
                        {emoji} {String(count)}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Stack>
          );
        })}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Tooltip title="Image">
          <IconButton onClick={() => setPicker(true)}>
            <ImageIcon />
          </IconButton>
        </Tooltip>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          fullWidth
          size="small"
          multiline
          maxRows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={(e) => setEmojiAnchor(e.currentTarget)}>
                  <EmojiEmotionsIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <IconButton color="primary" onClick={() => submit()} disabled={!text.trim()}>
          <SendIcon />
        </IconButton>
      </Stack>

      <Popover
        open={!!emojiAnchor}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 1, fontSize: 24 }}>
          {EMOJIS.map((e) => (
            <Box
              key={e}
              sx={{ cursor: 'pointer', px: 0.5 }}
              onClick={() => insertEmoji(e)}
            >
              {e}
            </Box>
          ))}
        </Stack>
      </Popover>

      <Popover
        open={!!reactAnchor}
        anchorEl={reactAnchor?.el}
        onClose={() => setReactAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 1, fontSize: 22 }}>
          {EMOJIS.map((e) => (
            <Box
              key={e}
              sx={{ cursor: 'pointer', px: 0.5 }}
              onClick={() => onReact(e)}
            >
              {e}
            </Box>
          ))}
        </Stack>
      </Popover>

      <MediaPickerDialog
        open={picker}
        onClose={() => setPicker(false)}
        onPicked={(url) => {
          setPicker(false);
          submit(url);
        }}
        folder="/chat"
        title="Send image"
      />
    </Stack>
  );
}
