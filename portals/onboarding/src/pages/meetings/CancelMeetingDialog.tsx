import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { CANCEL_MEETING, type OnboardingMeeting } from './queries';

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  /** Called after a successful cancel so the table can refetch. */
  onCancelled: () => Promise<unknown> | void;
}

/** Staff cancel-with-reason dialog — the applicant is emailed the reason and
 * asked to fill the survey again and book a new slot. */
export default function CancelMeetingDialog({ meeting, onClose, onCancelled }: Readonly<Props>) {
  const [cancelMeeting, { loading }] = useMutation(CANCEL_MEETING);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!meeting) return;
    if (!reason.trim()) {
      setError('A cancellation reason is required — it is emailed to the applicant.');
      return;
    }
    setError(null);
    try {
      await cancelMeeting({ variables: { id: meeting.id, reason: reason.trim() } });
      setReason('');
      onClose();
      await onCancelled();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel the meeting');
    }
  };

  return (
    <Dialog open={!!meeting} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Cancel meeting</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          The applicant ({meeting?.user_name || meeting?.contact_name || 'applicant'}) will be
          emailed this reason and asked to fill the survey again and book a new slot.
        </Typography>
        <TextField
          size="small"
          label="Reason"
          placeholder="e.g. Survey responses don't meet the requirements"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Keep meeting</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={loading}>
          {loading ? 'Cancelling…' : 'Cancel meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
