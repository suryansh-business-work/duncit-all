import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import type { Coworker, StaffMessage } from './queries';

interface Props {
  peer: Coworker;
  meId: string;
  messages: StaffMessage[];
  sending: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onTyping: () => void;
}

const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** One line of the conversation. Hoisted, so it is not rebuilt every render. */
function Bubble({ message, mine }: Readonly<{ message: StaffMessage; mine: boolean }>) {
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Paper
        variant="outlined"
        sx={{
          px: 1.25,
          py: 0.75,
          maxWidth: '80%',
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          borderColor: mine ? 'primary.main' : 'divider',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.text}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right' }}>
          {time(message.created_at)}
        </Typography>
      </Paper>
    </Box>
  );
}

export default function Conversation({
  peer,
  meId,
  messages,
  sending,
  onBack,
  onSend,
  onTyping,
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  // A chat that opens at the top of a hundred messages is a chat you have to
  // scroll before you can read the one that arrived.
  useEffect(() => {
    // Optional call: jsdom has the element but not the method, and a chat that
    // throws while scrolling would take the whole drawer down with it.
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton size="small" onClick={onBack} aria-label="Back to coworkers">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Avatar src={peer.photo || undefined} sx={{ width: 30, height: 30 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {peer.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {peer.email}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Say hello.
          </Typography>
        )}
        {messages.map((message) => (
          <Bubble key={message.id} message={message} mine={message.from_user_id === meId} />
        ))}
        <div ref={endRef} />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder="Write a message"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line — what every chat does,
            // and what fingers already expect.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <IconButton color="primary" onClick={send} disabled={!draft.trim() || sending} aria-label="Send message">
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
