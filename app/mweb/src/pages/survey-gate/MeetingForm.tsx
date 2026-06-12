import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import SlotPicker from './SlotPicker';
import { MEETING_SLOTS, type MeetingSlot } from './queries';

export interface MeetingInput {
  requested_at: string;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

interface Props {
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: MeetingInput) => void;
}

/** Final gate step: pick an open onboarding slot (booked ones are disabled). */
export default function MeetingForm({ submitting, error: submitError, onSubmit }: Readonly<Props>) {
  const { data, loading, error } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    fetchPolicy: 'network-only',
  });
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const slots = useMemo(() => data?.meetingSlots ?? [], [data]);

  const submit = () => {
    if (!slot) { setFormError('Pick an available slot.'); return; }
    if (!phone.trim()) { setFormError('Phone number is required so our team can reach you.'); return; }
    setFormError(null);
    onSubmit({ requested_at: slot, notes: notes || null, contact_name: name || null, contact_phone: phone.trim() });
  };

  if (loading && !data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (slots.length === 0) {
    return <Alert severity="info">No slots are open right now — please check back soon.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pick an open slot — our onboarding team will meet you then to take you through the next steps.
      </Typography>

      <SlotPicker slots={slots} value={slot} onChange={setSlot} />

      <TextField size="small" label="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
      <TextField size="small" label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
      <TextField size="small" label="Anything we should know? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
      {(formError || submitError) && <Alert severity="warning">{formError ?? submitError}</Alert>}
      <Button variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>
        {submitting ? 'Booking…' : 'Book this slot'}
      </Button>
    </Stack>
  );
}
