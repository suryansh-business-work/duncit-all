import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  /** Backout attempts the user still has for this pod (max − used). */
  attemptsLeft: number;
  /** Server error (e.g. replacement already confirmed) shown inside the dialog. */
  error?: string | null;
}

/**
 * "Change of plans?" — cancel an in-process backout and restore the booking.
 * Only possible while the released seat has not been rebooked; a confirmed
 * replacement surfaces as an inline error from the server.
 */
export default function KeepSpotDialog({
  open,
  onClose,
  onConfirm,
  busy,
  attemptsLeft,
  error = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>{t('mweb.podDetails.changeOfPlans')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">
          {t('mweb.podDetails.keepSpotBody', { vars: { count: attemptsLeft } })}
        </Typography>
        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('mweb.podDetails.close')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? t('mweb.podDetails.restoring') : t('mweb.podDetails.keepMySpot')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
