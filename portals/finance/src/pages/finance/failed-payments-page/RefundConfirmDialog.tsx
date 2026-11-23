import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { EM_DASH } from '@duncit/table';
import { fmt } from '../payment-logs-page/helpers';
import { FAILED_PAYMENT_REFUND_PREVIEW, type FailedPaymentRefundPreviewData } from './queries';
import type { FailedPaymentActions, OpenDialog } from './useFailedPaymentActions';

interface Props {
  dialog: OpenDialog;
  actions: FailedPaymentActions;
}

/**
 * Confirm a refund after Razorpay has said what it would send. The dialog asks
 * the server's live check first (the same check the refund runs), so Finance
 * sees the exact amount and payment — or why there is nothing to refund — and
 * Confirm stays off until Razorpay says yes. The server re-checks on Confirm.
 */
export default function RefundConfirmDialog({ dialog, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<FailedPaymentRefundPreviewData>(FAILED_PAYMENT_REFUND_PREVIEW, {
    variables: { caseId: dialog.target.id },
    fetchPolicy: 'network-only',
  });
  const preview = data?.failedPaymentRefundPreview;
  const refundable = preview?.refundable === true;
  const amount = fmt(preview?.amount ?? dialog.target.refundable_amount ?? dialog.target.amount, dialog.target.currency_symbol);

  return (
    <Dialog open onClose={actions.busy ? undefined : actions.close} fullWidth maxWidth="xs" aria-labelledby="failed-payment-refund-title">
      <DialogTitle id="failed-payment-refund-title">{t('finance.failedPayments.refundDialogTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {loading && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status" data-testid="failed-payment-refund-checking">
              <CircularProgress size={18} aria-hidden />
              <Typography variant="body2">{t('finance.failedPayments.refundChecking')}</Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{parseApiError(error)}</Alert>}
          {preview && !refundable && (
            <Alert severity="info" data-testid="failed-payment-refund-blocked">
              {preview.reason || t('finance.failedPayments.refundNotPossible')}
            </Alert>
          )}
          {refundable && (
            <>
              <Typography variant="body2">
                {t('finance.failedPayments.refundDialogBody', { vars: { amount, name: dialog.target.user_name } })}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }} data-testid="failed-payment-refund-payment-id">
                {t('finance.failedPayments.razorpayPaymentId')}: {preview?.razorpay_payment_id || EM_DASH}
              </Typography>
              <Alert severity="warning">{t('finance.failedPayments.refundDialogWarning')}</Alert>
            </>
          )}
          {actions.error && <Alert severity="error">{actions.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={actions.close} disabled={actions.busy}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          color="success"
          variant="contained"
          loading={actions.busy}
          disabled={!refundable}
          onClick={() => actions.confirmRefund(dialog)}
          data-testid="failed-payment-refund-confirm"
        >
          {t('finance.failedPayments.confirmRefund')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
