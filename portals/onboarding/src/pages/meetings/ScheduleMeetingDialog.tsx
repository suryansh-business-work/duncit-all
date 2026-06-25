import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ScheduleSlotPicker from './ScheduleSlotPicker';
import {
  MEETING_SLOTS,
  UPDATE_MEETING,
  type MeetingSlot,
  type MeetingStatus,
  type OnboardingMeeting,
} from './queries';

const STATUSES: MeetingStatus[] = ['REQUESTED', 'SCHEDULED', 'DONE', 'CANCELLED'];
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Slot-aware scheduling dialog — staff pick an open slot (booked ones disabled)
 * instead of a free datetime, so two applicants can't land on the same time. */
export default function ScheduleMeetingDialog({ meeting, onClose, onSaved }: Readonly<Props>) {
  const { data, loading } = useQuery<{ meetingSlots: MeetingSlot[] }>(MEETING_SLOTS, {
    variables: { exclude_meeting_id: meeting?.id },
    skip: !meeting,
    fetchPolicy: 'network-only',
  });
  const [updateMeeting, { loading: saving }] = useMutation(UPDATE_MEETING);
  const [slot, setSlot] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('SCHEDULED');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meeting) return;
    setSlot(meeting.scheduled_at ?? meeting.requested_at ?? '');
    setStatus(meeting.status === 'REQUESTED' ? 'SCHEDULED' : meeting.status);
    setLink(meeting.meeting_link ?? '');
    setNotes(meeting.notes ?? '');
    setError(null);
  }, [meeting]);

  const slots = data?.meetingSlots ?? [];

  const save = async () => {
    if (!meeting) return;
    if (status === 'SCHEDULED' && !slot) {
      setError('Pick an open slot for the meeting.');
      return;
    }
    setError(null);
    try {
      await updateMeeting({
        variables: {
          id: meeting.id,
          input: { status, scheduled_at: slot || null, meeting_link: link.trim() || null, notes },
        },
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update meeting');
    }
  };

  return (
    <Dialog open={!!meeting} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Schedule meeting</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="caption" color="text.secondary">
            Requested for {fmt(meeting?.requested_at)}{meeting?.notes ? ` · ${meeting.notes}` : ''}
          </Typography>
          {loading && slots.length === 0 ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}><CircularProgress size={22} /></Box>
          ) : (
            <ScheduleSlotPicker slots={slots} value={slot} onChange={setSlot} />
          )}
          <TextField size="small" type="url" label="Meeting link" placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} fullWidth />
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)} fullWidth>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
