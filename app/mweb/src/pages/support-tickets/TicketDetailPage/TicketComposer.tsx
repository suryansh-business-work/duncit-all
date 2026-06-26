import { useState } from 'react';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachmentsField from '../../../forms/support-form/AttachmentsField';

interface Props {
  /** Resolved/closed tickets lock the reply box (B7). */
  locked: boolean;
  busy: boolean;
  onSend: (message: string, attachments: string[]) => void;
}

/** Reply composer for a ticket; read-only once the ticket is resolved/closed. */
export default function TicketComposer({ locked, busy, onSend }: Readonly<Props>) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  if (locked) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          This conversation has been marked as resolved.
        </Typography>
      </Paper>
    );
  }

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    onSend(message.trim(), attachments);
    setMessage('');
    setAttachments([]);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Stack spacing={1}>
        <AttachmentsField attachments={attachments} setAttachments={setAttachments} />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            fullWidth
            placeholder="Write a reply…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={busy || (!message.trim() && attachments.length === 0)}
            onClick={handleSend}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
