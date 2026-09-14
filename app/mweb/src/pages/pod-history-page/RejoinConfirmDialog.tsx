import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirms a free rejoin of a backed-out pod. RN twin: mobile RejoinConfirmDialog. */
export default function RejoinConfirmDialog({ open, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      data-testid="rejoin-dialog"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.podHistory.rejoinTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('mweb.podHistory.rejoinBody')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy} data-testid="rejoin-cancel">
          {t('mweb.podHistory.cancel')}
        </DuncitButton>
        <DuncitButton
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          color="success"
          startIcon={<ReplayIcon />}
          data-testid="rejoin-confirm"
        >
          {busy ? t('mweb.podHistory.rejoining') : t('mweb.podHistory.rejoinFree')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
