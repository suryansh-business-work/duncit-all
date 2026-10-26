import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { CANCEL_MY_MEETING } from './queries';
import { useEarnSurface } from './EarnSurfaceProvider';
import { MeetingReasonForm } from './meeting-reason';

interface Props {
  open: boolean;
  kind: string;
  onClose: () => void;
  onDone: () => void;
}

/** Cancel dialog — mandatory reason (no native confirm), frees the slot. */
export default function CancelMeetingDialog({ open, kind, onClose, onDone }: Readonly<Props>) {
  const { meetingLabels: labels } = useEarnSurface();
  const [error, setError] = useState<string | null>(null);
  const [cancelMut, { loading: cancelling }] = useMutation<any>(CANCEL_MY_MEETING);

  const submit = async (reason: string) => {
    setError(null);
    try {
      await cancelMut({ variables: { kind, reason } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.cancelFailed);
    }
  };

  return (
    <Dialog data-testid="cancel-dialog" open={open} onClose={() => !cancelling && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle data-testid="cancel-title" sx={{ fontWeight: 700 }}>{labels.cancelTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <DialogContentText data-testid="cancel-body">{labels.cancelBody}</DialogContentText>
          <MeetingReasonForm
            formId="cancel-reason-form"
            testId="cancel-reason"
            label={labels.cancelReasonLabel}
            helperText={labels.cancelReasonHint}
            labels={labels}
            onSubmit={submit}
          />
          {error && <Alert data-testid="cancel-error" severity="warning">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="cancel-keep" onClick={onClose} disabled={cancelling}>
          {labels.keepMeeting}
        </DuncitButton>
        <DuncitButton
          type="submit"
          data-testid="cancel-confirm"
          form="cancel-reason-form"
          color="error"
          variant="contained"
          disabled={cancelling}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {cancelling ? labels.cancelling : labels.cancelCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
