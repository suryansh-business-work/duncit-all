import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onHistory: () => void;
}

/** Turns the ALREADY_BOOKED conflict into a useful next step instead of a raw
 * GraphQL error on the payment form. */
export default function AlreadyBookedDialog({ open, onClose, onHistory }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.checkout.alreadyBookedTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('mweb.checkout.alreadyBookedMessage')}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('mweb.checkout.alreadyBookedStay')}</Button>
        <Button variant="contained" onClick={onHistory}>
          {t('mweb.checkout.alreadyBookedHistory')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
