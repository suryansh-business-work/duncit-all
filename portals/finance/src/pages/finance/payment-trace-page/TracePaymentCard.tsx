import { Link as RouterLink } from 'react-router';
import { Box, Chip, Link, Stack } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import type { PaymentTraceMatch, PaymentTracePayment } from '@duncit/gql-types';
import { STATUS_COLORS, fmt } from '../payment-logs-page/helpers';
import { paymentSourceLabels } from '../payment-logs-page/paymentSource';
import { tracedId } from '../../../components/TraceLink';
import DetailCard from '../failed-payments-page/detail/DetailCard';

interface Props {
  payment: PaymentTracePayment;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** Each key a literal, so the localization gate sees it rendered. */
const matchLabels = (t: Translator['t']): Record<PaymentTraceMatch, string> => ({
  DUNCIT_REF: t('finance.paymentTrace.matchDuncitRef'),
  INVOICE: t('finance.paymentTrace.matchInvoice'),
  DOCUMENT_ID: t('finance.paymentTrace.matchDocumentId'),
  RAZORPAY_PAYMENT: t('finance.paymentTrace.matchRazorpayPayment'),
  RAZORPAY_ORDER: t('finance.paymentTrace.matchRazorpayOrder'),
  RAZORPAY_REFUND: t('finance.paymentTrace.matchRazorpayRefund'),
});

/**
 * One payment the traced id belongs to: which checkout it came from, which of
 * its ids matched, and all its ids as trace links, with the way into its full
 * Payment Logs page.
 */
export default function TracePaymentCard({ payment: p, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const matches = matchLabels(t);

  return (
    <DetailCard
      title={t('finance.paymentTrace.paymentTitle', { vars: { ref: p.payment_id } })}
      testId="payment-trace-payment"
      lines={[
        { label: t('finance.paymentTrace.checkout'), value: paymentSourceLabels(t)[p.source] },
        { label: t('finance.paymentTrace.amount'), value: fmt(p.amount, p.currency_symbol) },
        { label: t('finance.paymentTrace.member'), value: p.user_name },
        { label: t('finance.paymentTrace.description'), value: p.description },
        { label: t('finance.payment.idDuncitRef'), value: tracedId(p.payment_id) },
        { label: t('finance.payment.idInvoice'), value: tracedId(p.invoice_no) },
        { label: t('finance.payment.idRazorpayPayment'), value: tracedId(p.razorpay_payment_id) },
        { label: t('finance.payment.idRazorpayOrder'), value: tracedId(p.razorpay_order_id) },
        // One line per refund; numbered so each line keeps its own label.
        ...p.razorpay_refund_ids.map((id, i) => ({ label: `${t('finance.payment.idRazorpayRefund')} ${i + 1}`, value: tracedId(id) })),
        { label: t('finance.paymentTrace.checkoutState'), value: p.finalize_state },
        { label: t('finance.paymentTrace.createdAt'), value: formatDateTime(p.created_at) },
        { label: t('finance.paymentTrace.paidAt'), value: p.paid_at ? formatDateTime(p.paid_at) : null },
      ]}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusChip status={p.status} colorMap={STATUS_COLORS} />
        {p.matched_on.map((match) => (
          <Chip key={match} size="small" color="primary" variant="outlined" label={t('finance.paymentTrace.matchedOn', { vars: { field: matches[match] } })} />
        ))}
        <Box sx={{ flex: 1 }} />
        <Link component={RouterLink} to={`/payment-logs/${encodeURIComponent(p.id)}`} variant="body2" data-testid="payment-trace-open-payment">
          {t('finance.paymentTrace.openPayment')}
        </Link>
      </Stack>
    </DetailCard>
  );
}
