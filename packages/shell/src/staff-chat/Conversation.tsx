import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallIcon from '@mui/icons-material/Call';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import EmojiPicker from './EmojiPicker';
import MessageBubble from './MessageBubble';
import PresenceDot from './PresenceDot';
import type { Coworker, StaffMessage, StaffReactionKind } from './queries';
import type { PresenceStatus } from './usePresence';

interface Props {
  peer: Coworker;
  meId: string;
  status: PresenceStatus;
  messages: StaffMessage[];
  sending: boolean;
  uploading: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, kind: StaffReactionKind) => void;
  onTyping: () => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onExport: () => void;
}

export default function Conversation({
  peer,
  meId,
  status,
  messages,
  sending,
  uploading,
  onBack,
  onSend,
  onAttach,
  onEdit,
  onDelete,
  onReact,
  onTyping,
  onCall,
  onExport,
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // A chat that opens at the top of a hundred messages is a chat you have to
  // scroll before you can read the one that arrived.
  useEffect(() => {
    // Optional call: jsdom has the element but not the method, and a chat that
    // throws while scrolling would take the whole panel down with it.
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
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <IconButton size="small" onClick={onBack} aria-label="Back to coworkers">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <PresenceDot status={status}>
          <Avatar src={peer.photo || undefined} sx={{ width: 30, height: 30 }} />
        </PresenceDot>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {peer.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {status.toLowerCase()}
          </Typography>
        </Box>
        <Tooltip title="Audio call">
          <IconButton size="small" onClick={() => onCall('AUDIO')} aria-label="Start audio call">
            <CallIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Video call">
          <IconButton size="small" onClick={() => onCall('VIDEO')} aria-label="Start video call">
            <VideocamIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export this conversation">
          <IconButton size="small" onClick={onExport} aria-label="Export conversation">
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {uploading && <LinearProgress />}

      <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Say hello.
          </Typography>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.from_user_id === meId}
            meId={meId}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
          />
        ))}
        <div ref={endRef} />
      </Stack>

      <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Tooltip title="Attach a file">
          <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach a file">
            <AttachFileIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {/* Any file, not only images — a chat where you cannot send a PDF is a
            chat people leave to send the PDF. */}
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAttach(file);
            event.target.value = '';
          }}
        />
        <EmojiPicker disabled={sending} onPick={(emoji) => setDraft((text) => text + emoji)} />
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
