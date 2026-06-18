import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { EMAIL_SUPPORT_CHAT_TRANSCRIPT } from './queries';

interface Props {
  open: boolean;
  sessionId: string;
  defaultEmail?: string;
  onClose: () => void;
}

export default function EmailTranscriptDialog({ open, sessionId, defaultEmail, onClose }: Readonly<Props>) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [send, { loading }] = useMutation(EMAIL_SUPPORT_CHAT_TRANSCRIPT);

  const handleSend = async () => {
    setError(null);
    try {
      await send({ variables: { session_id: sessionId, email: email.trim() } });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not email the transcript.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>Email this chat</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success">Transcript sent to {email}.</Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              size="small"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 1 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{done ? 'Done' : 'Cancel'}</Button>
        {!done && (
          <Button variant="contained" disabled={loading || !email.trim()} onClick={handleSend}>
            {loading ? 'Sending…' : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
