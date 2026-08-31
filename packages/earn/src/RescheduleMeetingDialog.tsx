import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import EarnSlotPicker from './EarnSlotPicker';
import { useEarnSurface } from './EarnSurfaceProvider';
import { MEETING_SLOTS, RESCHEDULE_MY_MEETING, type MeetingSlot } from './queries';
import { MeetingReasonForm } from './meeting-reason';

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
  const { meetingLabels: labels } = useEarnSurface();
  const [slot, setSlot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    variables: { kind },
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [rescheduleMut, { loading: rescheduling }] = useMutation<any>(RESCHEDULE_MY_MEETING);
  const slots = data?.meetingSlots ?? [];

  const submit = async (reason: string) => {
    if (!slot) { setError(labels.pickSlot); return; }
    setError(null);
    try {
      await rescheduleMut({ variables: { kind, requested_at: slot, reason } });
      setSlot('');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.rescheduleFailed);
      await refetch();
    }
  };

  const showLoader = loading && !data;

  return (
    <Dialog open={open} onClose={() => !rescheduling && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{labels.rescheduleTitle}</DialogTitle>
      <DialogContent>
        {showLoader ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <Stack spacing={1.5}>
            {bookedAt && (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {labels.currentlyBooked(formatSlot(bookedAt))}
              </Typography>
            )}
            {slots.length === 0 ? (
              <Alert severity="info">{labels.noSlots}</Alert>
            ) : (
              <EarnSlotPicker slots={slots} value={slot} onChange={setSlot} currentSlot={bookedAt} />
            )}
            {slot && (
              <Typography variant="body2">
                {labels.movingFromTo(formatSlot(bookedAt), formatSlot(slot))}
              </Typography>
            )}
            <MeetingReasonForm
              formId="reschedule-reason-form"
              label={labels.rescheduleReasonLabel}
              helperText={labels.rescheduleReasonHint}
              labels={labels}
              onSubmit={submit}
            />
            {error && <Alert severity="warning">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={rescheduling}>
          {labels.close}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="reschedule-reason-form"
          variant="contained"
          disabled={rescheduling || slots.length === 0}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {rescheduling ? labels.moving : labels.moveCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
