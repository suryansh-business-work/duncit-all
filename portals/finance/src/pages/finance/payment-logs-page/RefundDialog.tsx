import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { fmt } from './helpers';

interface Props {
  refundFor: any;
  refundReason: string;
  setRefundReason: (s: string) => void;
  refundLoading: boolean;
  actionError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RefundDialog({
  refundFor,
  refundReason,
  setRefundReason,
  refundLoading,
  actionError,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!refundFor} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('finance.payment.refundDialogTitle')}</DialogTitle>
      <DialogContent dividers>
        {refundFor && (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Refund <b>{fmt(refundFor.total, refundFor.currency_symbol)}</b> to{' '}
              {refundFor.user_name}?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Payment ID: {refundFor.payment_id}
            </Typography>
            <TextField
              label={t('finance.payment.refundReason')}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('finance.payment.cancel')}</Button>
        <Button
          color="warning"
          variant="contained"
          disabled={refundLoading}
          onClick={onConfirm}
        >
          {refundLoading ? t('finance.payment.refunding') : t('finance.payment.confirmRefund')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
