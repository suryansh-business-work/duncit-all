import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import type { HostRequest } from './queries';

export type DecisionMode = 'APPROVE' | 'REJECT';

interface Props {
  mode: DecisionMode | null;
  request: HostRequest | null;
  busy: boolean;
  onClose: () => void;
  /** Called with the trimmed notes (empty string allowed only for approve). */
  onConfirm: (notes: string) => void;
}

const COPY: Record<DecisionMode, { title: string; label: string; helper: string; cta: string; color: 'success' | 'error' }> = {
  APPROVE: {
    title: 'Approve host request',
    label: 'Notes (optional)',
    helper: 'Shared with the host on approval.',
    cta: 'Approve',
    color: 'success',
  },
  REJECT: {
    title: 'Reject host request',
    label: 'Reason',
    helper: 'Required — shared with the host so they know why.',
    cta: 'Reject',
    color: 'error',
  },
};

/** Approve (optional notes) / Reject (required reason) confirmation for a request. */
export default function DecisionDialog({ mode, request, busy, onClose, onConfirm }: Readonly<Props>) {
  const [notes, setNotes] = useState('');
  if (!mode) return null;
  const copy = COPY[mode];
  const trimmed = notes.trim();
  const disabled = busy || (mode === 'REJECT' && !trimmed);

  const close = () => {
    setNotes('');
    onClose();
  };
  const confirm = () => {
    if (disabled) return;
    onConfirm(trimmed);
    setNotes('');
  };

  return (
    <Dialog open={!!request} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {request?.request_no} · {request?.host_name}
        </Typography>
        <TextField
          label={copy.label}
          helperText={copy.helper}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          required={mode === 'REJECT'}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" color={copy.color} onClick={confirm} disabled={disabled}>
          {copy.cta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
