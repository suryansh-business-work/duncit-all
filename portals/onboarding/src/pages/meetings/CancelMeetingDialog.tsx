import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { CANCEL_MEETING, type OnboardingMeeting } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  /** The cancelled meeting, so the caller can update its row without refetching. */
  onCancelled: (cancelled?: OnboardingMeeting | null) => Promise<unknown> | void;
}

/** Staff cancel-with-reason dialog — the applicant is emailed the reason and
 * asked to fill the survey again and book a new slot. */
export default function CancelMeetingDialog({ meeting, onClose, onCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
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
      setError(t('onboarding.meetings.aCancellationReasonIsRequiredIt'));
      return;
    }
    setError(null);
    try {
      const res = await cancelMeeting({ variables: { id: meeting.id, reason: reason.trim() } });
      setReason('');
      onClose();
      await onCancelled(res.data?.cancelMeeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.meetings.couldNotCancelTheMeeting'));
    }
  };

  return (
    <Dialog open={!!meeting} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t('onboarding.meetings.cancelMeeting')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          The applicant ({meeting?.user_name || meeting?.contact_name || 'applicant'}) will be
          emailed this reason and asked to fill the survey again and book a new slot.
        </Typography>
        <TextField
          size="small"
          label={t('onboarding.common.reason')}
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
        <DuncitButton onClick={close}>{t('onboarding.meetings.keepMeeting')}</DuncitButton>
        <DuncitButton color="error" variant="contained" onClick={confirm} disabled={loading}>
          {loading ? 'Cancelling…' : 'Cancel meeting'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
