import { useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

interface Props {
  busy: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

/** Decline needs a reason so the host knows what to fix before re-requesting;
 * it is shared with them and kept on the pod's audit trail. */
export default function DeclineForm({ busy, onSubmit, onCancel }: Readonly<Props>) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" fontWeight={700}>
        Why are you declining?
      </Typography>
      <TextField
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        multiline
        minRows={3}
        fullWidth
        placeholder="e.g. the space is already blocked for a private event that evening"
        inputProps={{ maxLength: 280 }}
        helperText={`Shared with the host so they can follow up · ${trimmed.length}/280`}
      />
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={busy}>
          Keep it pending
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<CancelIcon />}
          disabled={busy || trimmed.length === 0}
          onClick={() => onSubmit(trimmed)}
        >
          {busy ? 'Declining…' : 'Decline booking'}
        </Button>
      </Stack>
    </Stack>
  );
}
