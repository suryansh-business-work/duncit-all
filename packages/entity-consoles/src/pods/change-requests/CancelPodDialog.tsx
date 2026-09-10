import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CANCEL_POD_FOR_CHANGE } from '@duncit/pod-change-requests';
import type { PodChangeRow } from '@duncit/utils';

const REASON_MIN = 5;
const REASON_MAX = 500;

interface Props {
  request: PodChangeRow | null;
  onClose: () => void;
  onCancelled: (message: string) => void;
}

/**
 * The queue's destructive action, behind a reason.
 *
 * A bespoke dialog rather than `useConfirm`, for the reason the shared one
 * documents: it clears its message node the instant Confirm is pressed, so a
 * live input inside it loses its value. The note is required because attendees
 * are only told a pod was cancelled — this is the only record of WHY, and it is
 * what Finance reads when a refund is queried later.
 */
export default function CancelPodDialog({ request, onClose, onCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cancel, cancelState] = useMutation<any>(CANCEL_POD_FOR_CHANGE);

  // A dialog reopened on a different request must not carry the last note.
  useEffect(() => {
    setReason('');
    setTouched(false);
    setErrorText(null);
  }, [request?.id]);

  if (!request) return null;

  const tooShort = reason.trim().length < REASON_MIN;

  const submit = () => {
    setTouched(true);
    if (tooShort) return;
    setErrorText(null);
    cancel({ variables: { request_id: request.id, reason: reason.trim() } })
      .then(() => {
        onCancelled(t('admin.changeRequests.cancelDone'));
        onClose();
        return undefined;
      })
      .catch((error: Error) => setErrorText(error.message));
  };

  return (
    <Dialog open onClose={cancelState.loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('admin.changeRequests.cancelTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="error">{t('admin.changeRequests.cancelBody')}</Alert>
          <Alert severity="info">
            {request.pod.pod_title} · {t('admin.changeRequests.colAttendees')}:{' '}
            {request.pod.attendee_count}
          </Alert>
          <TextField
            label={t('admin.changeRequests.cancelReasonLabel')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && tooShort}
            helperText={
              touched && tooShort
                ? t('admin.changeRequests.cancelReasonRequired')
                : t('admin.changeRequests.cancelReasonHint')
            }
            multiline
            minRows={3}
            fullWidth
            slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
          />
          {errorText && <Alert severity="error">{errorText}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={cancelState.loading}>
          {t('admin.changeRequests.close')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          color="error"
          onClick={submit}
          disabled={cancelState.loading}
        >
          {t('admin.changeRequests.cancelCta')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
