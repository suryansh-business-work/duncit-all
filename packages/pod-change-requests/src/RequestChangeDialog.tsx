import { useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { changeRequestConfirmKey, type PodChangeRole } from '@duncit/utils';
import { useTranslation } from './i18n';

const REASON_MAX = 500;

interface Props {
  open: boolean;
  role: PodChangeRole;
  /** Account Health points this ask costs, straight off the board's numbers. */
  penalty: number;
  /** Seats already sold, so the partner sees who they are affecting. */
  attendeeCount: number;
  busy: boolean;
  /** Set when the server refused — shown above the actions rather than as a toast. */
  errorText?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * The one thing between a tap and a deduction.
 *
 * It states the cost in points and the number of people already holding a seat
 * BEFORE the request is filed, because both are consequences the partner cannot
 * undo — a withdrawal does not return the points, and the guests are somebody
 * else's evening. A reason is required: it is the only thing an admin has to
 * work from when deciding between finding a replacement and cancelling the pod.
 */
export default function RequestChangeDialog({
  open,
  role,
  penalty,
  attendeeCount,
  busy,
  errorText,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const tooLong = reason.length > REASON_MAX;
  const missing = reason.trim().length === 0;
  let helper = t('changeRequest.reasonHint');
  if (touched && missing) helper = t('changeRequest.reasonRequired');
  else if (tooLong) helper = t('changeRequest.reasonTooLong');

  const close = () => {
    setReason('');
    setTouched(false);
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (missing || tooLong) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{t('changeRequest.confirmTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="warning">{t(changeRequestConfirmKey(role))}</Alert>
          <Alert severity="info">
            {penalty > 0
              ? t('changeRequest.penaltyNotice', { count: penalty, vars: { points: penalty } })
              : t('changeRequest.penaltyFree')}
          </Alert>
          {attendeeCount > 0 && (
            <Alert severity="warning">
              {t('changeRequest.attendeeNotice', {
                count: attendeeCount,
                vars: { count: attendeeCount },
              })}
            </Alert>
          )}
          <TextField
            label={t('changeRequest.reasonLabel')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            error={(touched && missing) || tooLong}
            helperText={helper}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
          />
          {errorText && <Alert severity="error">{errorText}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} disabled={busy}>
          {t('changeRequest.cancelCta')}
        </DuncitButton>
        <DuncitButton variant="contained" color="warning" onClick={submit} disabled={busy}>
          {t('changeRequest.confirmCta')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
