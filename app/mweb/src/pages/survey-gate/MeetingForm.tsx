import { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';

export interface MeetingInput {
  requested_at: string;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

interface Props {
  submitting: boolean;
  onSubmit: (input: MeetingInput) => void;
}

/** Step 2 of onboarding: propose a date/time for an onboarding meeting. */
export default function MeetingForm({ submitting, onSubmit }: Readonly<Props>) {
  const [when, setWhen] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!when) { setError('Pick a preferred date & time.'); return; }
    const iso = new Date(when);
    if (Number.isNaN(iso.getTime())) { setError('That date & time looks invalid.'); return; }
    setError(null);
    onSubmit({ requested_at: iso.toISOString(), notes: notes || null, contact_name: name || null, contact_phone: phone || null });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pick a time that suits you — our onboarding team will confirm a meeting to take you through the next steps.
      </Typography>
      <TextField
        size="small"
        type="datetime-local"
        label="Preferred date & time"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />
      <TextField size="small" label="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
      <TextField size="small" label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
      <TextField size="small" label="Anything we should know? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
      {error && <Alert severity="warning">{error}</Alert>}
      <Button variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>
        {submitting ? 'Scheduling…' : 'Request meeting & continue'}
      </Button>
    </Stack>
  );
}
