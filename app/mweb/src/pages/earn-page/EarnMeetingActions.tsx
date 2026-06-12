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
} from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ConfirmDialog from '../../components/ConfirmDialog';
import SlotPicker from '../survey-gate/SlotPicker';
import { MEETING_SLOTS, type MeetingSlot } from '../survey-gate/queries';

const RESCHEDULE_MY_MEETING = gql`
  mutation RescheduleMyMeeting($kind: SurveyKind!, $requested_at: String!) {
    rescheduleMyMeeting(kind: $kind, requested_at: $requested_at) {
      id
      requested_at
      status
    }
  }
`;
const CANCEL_MY_MEETING = gql`
  mutation CancelMyMeeting($kind: SurveyKind!) {
    cancelMyMeeting(kind: $kind) {
      id
      status
    }
  }
`;

interface Props {
  kind: string;
  /** Called after a successful reschedule/cancel so the page can refetch. */
  onChanged: () => void;
}

/** Reschedule / cancel actions for an Earn card with a pending onboarding meeting. */
export default function EarnMeetingActions({ kind, onChanged }: Readonly<Props>) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [slot, setSlot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    skip: !rescheduleOpen,
    fetchPolicy: 'network-only',
  });
  const [rescheduleMut, { loading: rescheduling }] = useMutation(RESCHEDULE_MY_MEETING);
  const [cancelMut, { loading: cancelling }] = useMutation(CANCEL_MY_MEETING);
  const slots = data?.meetingSlots ?? [];

  const reschedule = async () => {
    if (!slot) { setError('Pick an available slot.'); return; }
    setError(null);
    try {
      await rescheduleMut({ variables: { kind, requested_at: slot } });
      setRescheduleOpen(false);
      setSlot('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reschedule — please try again.');
      await refetch();
    }
  };

  const cancel = async () => {
    try {
      await cancelMut({ variables: { kind } });
      setCancelOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel — please try again.');
      setCancelOpen(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<EventRepeatIcon />}
        onClick={() => { setError(null); setRescheduleOpen(true); }}
        sx={{ borderRadius: 999, fontWeight: 800 }}
      >
        Reschedule meeting
      </Button>
      <Button
        size="small"
        color="error"
        variant="outlined"
        startIcon={<EventBusyIcon />}
        onClick={() => setCancelOpen(true)}
        sx={{ borderRadius: 999, fontWeight: 800 }}
      >
        Cancel meeting
      </Button>
      {error && !rescheduleOpen && <Alert severity="warning" sx={{ flex: 1, py: 0 }}>{error}</Alert>}

      <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Reschedule your onboarding meeting</DialogTitle>
        <DialogContent>
          {loading && !data ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : (
            <Stack spacing={1.5}>
              {slots.length === 0 ? (
                <Alert severity="info">No slots are open right now — please check back soon.</Alert>
              ) : (
                <SlotPicker slots={slots} value={slot} onChange={setSlot} />
              )}
              {error && <Alert severity="warning">{error}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleOpen(false)} disabled={rescheduling}>Close</Button>
          <Button variant="contained" onClick={reschedule} disabled={rescheduling || slots.length === 0}>
            {rescheduling ? 'Moving…' : 'Move to this slot'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this meeting?"
        message="Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime."
        confirmLabel="Cancel meeting"
        destructive
        busy={cancelling}
        onConfirm={() => void cancel()}
        onClose={() => setCancelOpen(false)}
      />
    </Stack>
  );
}
