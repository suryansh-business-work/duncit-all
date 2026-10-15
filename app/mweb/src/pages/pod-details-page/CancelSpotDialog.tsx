import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { freeSpotCancelHint, type FreeSpotCancels } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The membership state's cancel counters — names how many cancels are left. */
  cancels?: FreeSpotCancels | null;
}

/**
 * "Cancel your spot?" — the only way out of a FREE pod. No refund, so the
 * dialog says three things: the spot goes back on the pod, the member can join
 * again while it is open, and how many cancellations they have left (Pod
 * Settings caps them per member per pod — freeSpotCancelHint).
 * Used by Pod Details and Pod History. RN twin: mobile CancelSpotDialog.
 */
export default function CancelSpotDialog({ open, busy, onClose, onConfirm, cancels }: Readonly<Props>) {
  const { t } = useTranslation();
  const hint = freeSpotCancelHint(cancels);
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="cancel-spot-title"
      aria-describedby="cancel-spot-body"
      data-testid="cancel-spot-dialog"
    >
      <DialogTitle id="cancel-spot-title" sx={{ fontWeight: 700 }}>
        {t('mweb.podDetails.cancelSpotTitle')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="cancel-spot-body">{t('mweb.podDetails.cancelSpotBody')}</DialogContentText>
        {hint && (
          <DialogContentText data-testid="cancel-spot-limit-hint" sx={{ mt: 1.5, fontWeight: 600 }}>
            {t(hint.key, { vars: hint.vars })}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy} data-testid="cancel-spot-keep">
          {t('mweb.podDetails.keepSpot')}
        </DuncitButton>
        <DuncitButton
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          color="error"
          data-testid="cancel-spot-confirm"
        >
          {busy ? t('mweb.podDetails.cancellingSpot') : t('mweb.podDetails.cancelSpotConfirm')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
