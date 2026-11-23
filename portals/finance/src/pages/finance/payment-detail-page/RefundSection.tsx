import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import type { PaymentRefundSection, PaymentRefundState } from './queries';
import { REFUND_STATE_COLORS } from './refundLabels';
import RefundAccordion from './RefundAccordion';
import RefundToSourceDialog from './RefundToSourceDialog';
import { useRefundToSource } from './useRefundToSource';

interface Props {
  paymentDocId: string;
  currencySymbol: string;
  /** Null or empty when the payment never saw a refund: the whole area then disappears. */
  refunds: readonly PaymentRefundSection[] | null | undefined;
  formatDateTime: DateFormatter['formatDateTime'];
}

const STATES: readonly PaymentRefundState[] = ['PENDING', 'FAILED', 'COMPLETED'];

/**
 * The payment's Refund area: one accordion per kind of refund, in the order the
 * server returns them, under one heading with a one-line count of what is still
 * owed. It is its own card, apart from the checkout pipeline, because a refund
 * investigation is the likeliest reason this page is open.
 */
export default function RefundSection({ paymentDocId, currencySymbol, refunds, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const api = useRefundToSource(paymentDocId);
  const { target } = api;
  if (!refunds || refunds.length === 0) return null;

  const counts: Record<PaymentRefundState, number> = {
    PENDING: refunds.filter((section) => section.state === 'PENDING').length,
    FAILED: refunds.filter((section) => section.state === 'FAILED').length,
    COMPLETED: refunds.filter((section) => section.state === 'COMPLETED').length,
  };
  const summary: Record<PaymentRefundState, string> = {
    PENDING: t('finance.payment.refundArea.summaryPending', { vars: { n: counts.PENDING } }),
    FAILED: t('finance.payment.refundArea.summaryFailed', { vars: { n: counts.FAILED } }),
    COMPLETED: t('finance.payment.refundArea.summaryCompleted', { vars: { n: counts.COMPLETED } }),
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }} data-testid="payment-refund-section">
      <CardContent>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('finance.payment.refundArea.sectionTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          {t('finance.payment.refundArea.sectionCaption')}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
          {STATES.filter((state) => counts[state] > 0).map((state) => (
            <Chip key={state} size="small" variant="outlined" color={REFUND_STATE_COLORS[state]} label={summary[state]} />
          ))}
        </Stack>
        <Stack spacing={1.5}>
          {refunds.map((section) => (
            <RefundAccordion
              key={section.kind}
              section={section}
              currencySymbol={currencySymbol}
              formatDateTime={formatDateTime}
              onRefund={api.open}
            />
          ))}
        </Stack>
      </CardContent>
      {target && (
        <RefundToSourceDialog
          target={target}
          currencySymbol={currencySymbol}
          busy={api.busy}
          errorMessage={api.error}
          onClose={api.close}
          onSubmit={(note) => api.submit(target, note)}
        />
      )}
    </Card>
  );
}
