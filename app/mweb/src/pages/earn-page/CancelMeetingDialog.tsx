import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import { MeetingReasonForm } from './meeting-reason';

const CANCEL_MY_MEETING = gql`
  mutation CancelMyMeeting($kind: SurveyKind!, $reason: String) {
    cancelMyMeeting(kind: $kind, reason: $reason) {
      id
      status
    }
  }
`;

interface Props {
  open: boolean;
  kind: string;
  onClose: () => void;
  onDone: () => void;
}

/** Cancel dialog — mandatory reason (no native confirm), frees the slot. */
export default function CancelMeetingDialog({ open, kind, onClose, onDone }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [cancelMut, { loading: cancelling }] = useMutation(CANCEL_MY_MEETING);

  const submit = async (reason: string) => {
    setError(null);
    try {
      await cancelMut({ variables: { kind, reason } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel — please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={() => !cancelling && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Cancel this meeting?</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <DialogContentText>
            Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime.
          </DialogContentText>
          <MeetingReasonForm
            formId="cancel-reason-form"
            label="Reason for cancelling"
            helperText="Tell our onboarding team why you’re cancelling."
            onSubmit={submit}
          />
          {error && <Alert severity="warning">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={cancelling}>Keep meeting</Button>
        <Button
          type="submit"
          form="cancel-reason-form"
          color="error"
          variant="contained"
          disabled={cancelling}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {cancelling ? 'Cancelling…' : 'Cancel meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
