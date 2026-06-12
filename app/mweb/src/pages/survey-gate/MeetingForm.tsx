import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
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

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Final gate step: pick an open onboarding slot (booked ones are disabled). */
export default function MeetingForm({ submitting, error: submitError, onSubmit }: Readonly<Props>) {
  const { data, loading, error } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    fetchPolicy: 'network-only',
  });
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const slots = useMemo(() => data?.meetingSlots ?? [], [data]);
  const days = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of slots) {
      if (!seen.has(dayKey(s.start_at))) seen.set(dayKey(s.start_at), s.start_at);
    }
    return [...seen.values()];
  }, [slots]);
  const activeDay = day || days[0] || '';
  const daySlots = slots.filter((s) => dayKey(s.start_at) === dayKey(activeDay));

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
  if (days.length === 0) {
    return <Alert severity="info">No slots are open right now — please check back soon.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pick an open slot — our onboarding team will meet you then to take you through the next steps.
      </Typography>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Day</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {days.map((d) => (
            <Chip
              key={d}
              label={dayLabel(d)}
              color={dayKey(d) === dayKey(activeDay) ? 'primary' : 'default'}
              onClick={() => { setDay(d); setSlot(''); }}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Time slot</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {daySlots.map((s) => (
            <Chip
              key={s.start_at}
              label={timeLabel(s.start_at)}
              disabled={!s.available}
              color={slot === s.start_at ? 'primary' : 'default'}
              variant={s.available ? 'filled' : 'outlined'}
              onClick={() => setSlot(s.start_at)}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Greyed-out slots are already booked.
        </Typography>
      </Box>

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
