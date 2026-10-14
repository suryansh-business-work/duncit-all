import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * "Cancel your spot?" — the only way out of a FREE pod. No refund and no
 * attempts to count, so the dialog says just two things: the spot goes back
 * on the pod, and the member can join again while it is open.
 * Used by Pod Details and Pod History. RN twin: mobile CancelSpotDialog.
 */
export default function CancelSpotDialog({ open, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
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
