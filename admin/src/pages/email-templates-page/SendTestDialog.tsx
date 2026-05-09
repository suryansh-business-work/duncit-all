import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { SEND_TEST } from './queries';

interface Props {
  open: boolean;
  templateId: string | null;
  varsJson: string;
  onClose: () => void;
  onResult: (kind: 'success' | 'error', msg: string) => void;
}

export default function SendTestDialog({
  open,
  templateId,
  varsJson,
  onClose,
  onResult,
}: Props) {
  const [sendTest] = useMutation(SEND_TEST);
  const [testTo, setTestTo] = useState('');

  const submit = async () => {
    if (!templateId) return;
    const res = await sendTest({
      variables: { id: templateId, to: testTo, vars: varsJson },
    });
    const r = res.data?.sendTestEmail;
    onResult(r?.ok ? 'success' : 'error', r?.message || (r?.ok ? 'Sent' : 'Failed'));
    if (r?.ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Send test email</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="normal"
          type="email"
          label="To"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
        <Typography variant="caption" color="text.secondary">
          Uses the sample JSON from the Variables tab.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!testTo || !templateId} onClick={submit}>
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
}
