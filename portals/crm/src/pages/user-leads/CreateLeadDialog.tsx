import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { WA_CREATE_USER_LEAD } from '../tools/whatsapp/whatsappQueries';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Manually add a single user lead (phone + name) — dedupes by phone server-side. */
export default function CreateLeadDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [create, { loading, error }] = useMutation(WA_CREATE_USER_LEAD);

  const submit = async () => {
    if (!phone.replace(/[^\d]/g, '')) return;
    await create({ variables: { input: { phone, name: name || undefined } } });
    setPhone('');
    setName('');
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New user lead</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Phone (with country code)"
            size="small"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9198XXXXXXXX"
            error={!!error}
            helperText={error?.message}
            fullWidth
            autoFocus
          />
          <TextField
            label="Name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading || !phone.trim()}>
          {loading ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
