import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import SlotPicker from '../survey-gate/SlotPicker';
import { MEETING_SLOTS, type MeetingSlot } from '../survey-gate/queries';
import { MeetingReasonForm } from './meeting-reason';

const RESCHEDULE_MY_MEETING = gql`
  mutation RescheduleMyMeeting($kind: SurveyKind!, $requested_at: String!, $reason: String) {
    rescheduleMyMeeting(kind: $kind, requested_at: $requested_at, reason: $reason) {
      id
      requested_at
      status
      reschedule_count
    }
  }
`;

interface Props {
  open: boolean;
  kind: string;
  bookedAt: string | null;
  onClose: () => void;
  onDone: () => void;
}

const formatSlot = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

/** Reschedule dialog — shows the current slot, a new-slot picker and a mandatory reason. */
export default function RescheduleMeetingDialog({ open, kind, bookedAt, onClose, onDone }: Readonly<Props>) {
  const [slot, setSlot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [rescheduleMut, { loading: rescheduling }] = useMutation(RESCHEDULE_MY_MEETING);
  const slots = data?.meetingSlots ?? [];

  const submit = async (reason: string) => {
    if (!slot) { setError('Please pick an available slot.'); return; }
    setError(null);
    try {
      await rescheduleMut({ variables: { kind, requested_at: slot, reason } });
      setSlot('');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reschedule — please try again.');
      await refetch();
    }
  };

  const showLoader = loading && !data;

  return (
    <Dialog open={open} onClose={() => !rescheduling && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Reschedule your onboarding meeting</DialogTitle>
      <DialogContent>
        {showLoader ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <Stack spacing={1.5}>
            {bookedAt && (
              <Typography variant="body2" color="text.secondary">
                Currently booked for <strong>{formatSlot(bookedAt)}</strong>. You can reschedule once.
              </Typography>
            )}
            {slots.length === 0 ? (
              <Alert severity="info">No slots are open right now — please check back soon.</Alert>
            ) : (
              <SlotPicker slots={slots} value={slot} onChange={setSlot} />
            )}
            <MeetingReasonForm
              formId="reschedule-reason-form"
              label="Reason for rescheduling"
              helperText="Tell our onboarding team why you’re moving the meeting."
              onSubmit={submit}
            />
            {error && <Alert severity="warning">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={rescheduling}>Close</Button>
        <Button
          type="submit"
          form="reschedule-reason-form"
          variant="contained"
          disabled={rescheduling || slots.length === 0}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {rescheduling ? 'Moving…' : 'Move to this slot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
