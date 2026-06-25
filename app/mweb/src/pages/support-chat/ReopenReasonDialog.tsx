import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  /** Loading flag from the parent mutation. */
  loading?: boolean;
  /** Server error surfaced after a failed reopen (e.g. window passed). */
  error?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Captures a required, non-empty reason before re-opening a resolved/closed
 * ticket or chat. Reused by both TicketDetailPage and the chat header flow.
 */
export default function ReopenReasonDialog({ open, loading, error, onClose, onSubmit }: Readonly<Props>) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>Re-open this conversation</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Tell us why you need to re-open this — it helps our team pick up where you left off.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!trimmed || loading} onClick={submit}>
          {loading ? 'Re-opening…' : 'Re-open'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
