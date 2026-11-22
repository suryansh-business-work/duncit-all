import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { fmt } from '../payment-logs-page/helpers';
import ReviewFailedPaymentForm from './review-failed-payment';
import type { FailedPaymentActions, OpenDialog } from './useFailedPaymentActions';

/** The exact refund when the detail page knows it, else what the checkout asked for. */
const refundAmount = (dialog: OpenDialog) =>
  fmt(dialog.target.refundable_amount ?? dialog.target.amount, dialog.target.currency_symbol);

function RefundConfirmDialog({ dialog, actions }: Readonly<{ dialog: OpenDialog; actions: FailedPaymentActions }>) {
  const { t } = useTranslation();
  return (
    <Dialog open onClose={actions.busy ? undefined : actions.close} fullWidth maxWidth="xs" aria-labelledby="failed-payment-refund-title">
      <DialogTitle id="failed-payment-refund-title">{t('finance.failedPayments.refundDialogTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t('finance.failedPayments.refundDialogBody', {
              vars: { amount: refundAmount(dialog), name: dialog.target.user_name },
            })}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }} data-testid="failed-payment-refund-payment-id">
            {t('finance.failedPayments.razorpayPaymentId')}: {dialog.target.razorpay_payment_id || EM_DASH}
          </Typography>
          <Alert severity="warning">{t('finance.failedPayments.refundDialogWarning')}</Alert>
          {actions.error && <Alert severity="error">{actions.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={actions.close} disabled={actions.busy}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          color="success"
          variant="contained"
          loading={actions.busy}
          onClick={() => actions.confirmRefund(dialog)}
          data-testid="failed-payment-refund-confirm"
        >
          {t('finance.failedPayments.confirmRefund')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

/** Whichever decision dialog is open for the case — nothing when none is. */
export default function FailedPaymentDialogs({ actions }: Readonly<{ actions: FailedPaymentActions }>) {
  const { t } = useTranslation();
  const { dialog } = actions;
  if (!dialog) return null;
  if (dialog.kind === 'REFUND') return <RefundConfirmDialog dialog={dialog} actions={actions} />;
  return (
    <ReviewFailedPaymentForm
      open
      mode={dialog.kind}
      subject={t('finance.failedPayments.dialogSubject', {
        vars: { name: dialog.target.user_name, amount: fmt(dialog.target.amount, dialog.target.currency_symbol) },
      })}
      busy={actions.busy}
      errorMessage={actions.error}
      onClose={actions.close}
      onSubmit={(values) => actions.submitDecision(dialog, values)}
    />
  );
}
