import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { SEND_TEST } from '../../api/emailTemplates.gql';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  open: boolean;
  templateId: string | null;
  varsJson: string;
  onClose: () => void;
  onResult: (kind: 'success' | 'error', msg: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendTestDialog({ open, templateId, varsJson, onClose, onResult }: Readonly<Props>) {
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendTest, { loading }] = useMutation(SEND_TEST);
  const valid = EMAIL_RE.test(to.trim());

  useEffect(() => {
    if (open) { setTo(''); setError(null); }
  }, [open]);

  const submit = async () => {
    if (!templateId || !valid) return;
    setError(null);
    try {
      const res = await sendTest({ variables: { id: templateId, to: to.trim(), vars: varsJson } });
      const r = res.data?.sendTestEmail;
      const message = r?.message || (r?.ok ? 'Sent' : 'Failed');
      onResult(r?.ok ? 'success' : 'error', message);
      if (r?.ok) onClose();
      else setError(message);
    } catch (e) {
      const message = parseApiError(e);
      onResult('error', message);
      setError(message);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Send test email</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="normal"
          type="email"
          label="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={!!to && !valid}
          helperText={to && !valid ? 'Enter a valid email' : 'Uses the sample JSON from the Variables tab.'}
          disabled={loading}
        />
        {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
        {!templateId && <Alert severity="info" sx={{ mt: 1 }}>Save the template first.</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!templateId || loading || !valid}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Sending…' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
