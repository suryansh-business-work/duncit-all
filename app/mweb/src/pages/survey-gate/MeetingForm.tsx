import { useEffect, useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import SlotPicker from './SlotPicker';
import { MEETING_SLOTS, type MeetingSlot, type SurveyKind } from './queries';

const MEETING_ME = gql`
  query MeetingMe {
    me {
      user_id
      full_name
      phone_number
      phone_extension
    }
  }
`;

export interface MeetingInput {
  requested_at: string;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}

interface Props {
  kind: SurveyKind;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: MeetingInput) => void;
}

/** Final gate step: pick an open onboarding slot (booked ones — including the
 * user's own bookings in other onboarding flows — are disabled). */
export default function MeetingForm({ kind, submitting, error: submitError, onSubmit }: Readonly<Props>) {
  const { data, loading, error } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    variables: { kind },
    fetchPolicy: 'network-only',
  });
  const { data: meData } = useQuery(MEETING_ME, { fetchPolicy: 'cache-and-network' });
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [ext, setExt] = useState('+91');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Prefill from the signed-in user; locked when the profile already has them.
  const me = meData?.me;
  const hasProfilePhone = !!me?.phone_number?.trim();
  useEffect(() => {
    if (!me) return;
    if (me.full_name) setName(me.full_name);
    if (hasProfilePhone) {
      setPhone(me.phone_number);
      if (me.phone_extension) setExt(me.phone_extension);
    }
    // Prefill once when the profile lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const slots = useMemo(() => data?.meetingSlots ?? [], [data]);

  const submit = () => {
    if (!slot) { setFormError('Pick an available slot.'); return; }
    if (!phone.trim()) { setFormError('Phone number is required so our team can reach you.'); return; }
    setFormError(null);
    onSubmit({
      requested_at: slot,
      notes: notes || null,
      contact_name: name || null,
      contact_phone: `${ext.trim()} ${phone.trim()}`.trim(),
    });
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

      <TextField
        size="small"
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!!me?.full_name}
        helperText={me?.full_name ? 'From your profile.' : undefined}
        fullWidth
      />
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Ext."
          value={ext}
          onChange={(e) => setExt(e.target.value)}
          disabled={hasProfilePhone}
          sx={{ width: 96 }}
        />
        <TextField
          size="small"
          label="Phone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={hasProfilePhone}
          helperText={hasProfilePhone ? 'From your profile.' : 'Required so our team can reach you.'}
          fullWidth
        />
      </Stack>
      <TextField size="small" label="Anything we should know? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
      {(formError || submitError) && <Alert severity="warning">{formError ?? submitError}</Alert>}
      <Button variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>
        {submitting ? 'Booking…' : 'Book this slot'}
      </Button>
    </Stack>
  );
}
