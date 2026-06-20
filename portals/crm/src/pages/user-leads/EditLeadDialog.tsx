import { useEffect, useState } from 'react';
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
import { WA_UPDATE_USER_LEAD } from '../tools/whatsapp/whatsappQueries';
import type { LeadRow } from './LeadsTable';

interface Props {
  lead: LeadRow | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Edit a single user lead (name + phone). Phone is re-validated server-side. */
export default function EditLeadDialog({ lead, onClose, onSaved }: Readonly<Props>) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [update, { loading, error, reset }] = useMutation(WA_UPDATE_USER_LEAD);

  useEffect(() => {
    if (lead) {
      setPhone(lead.phone);
      setName(lead.name ?? '');
      reset();
    }
  }, [lead, reset]);

  const submit = async () => {
    if (!lead || !phone.replace(/[^\d]/g, '')) {
      return;
    }
    await update({ variables: { id: lead.id, input: { name, phone } } });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!lead} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit user lead</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Phone (with country code)"
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
