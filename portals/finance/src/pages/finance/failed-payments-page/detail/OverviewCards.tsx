import { Link as RouterLink } from 'react-router';
import { Link, Stack } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { fmt } from '../../payment-logs-page/helpers';
import DetailCard from './DetailCard';
import type { FailedPaymentDetail } from '../queries';

interface Props {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

const when = (iso: string | null | undefined, format: DateFormatter['formatDateTime']) => (iso ? format(iso) : '');

/**
 * What the checkout was and whether it booked anything, who paid, and what
 * Razorpay said when it failed — the three things Finance reads before deciding.
 */
export default function OverviewCards({ detail, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const yes = t('finance.failedPayments.yes');
  const no = t('finance.failedPayments.no');
  const { booking, user } = detail;
  const error = detail.latest_error;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <DetailCard
          title={t('finance.failedPayments.paymentSection')}
          testId="failed-payment-payment-card"
          lines={[
            {
              label: t('finance.failedPayments.paymentId'),
              value: (
                <Link component={RouterLink} to={`/payment-logs/${detail.payment_doc_id}`}>
                  {detail.payment_id}
                </Link>
              ),
            },
            { label: t('finance.failedPayments.amount'), value: fmt(detail.amount, detail.currency_symbol) },
            { label: t('finance.failedPayments.pod'), value: detail.pod_title },
            { label: t('finance.failedPayments.razorpayPaymentId'), value: detail.razorpay_payment_id },
            { label: t('finance.failedPayments.razorpayOrderId'), value: detail.razorpay_order_id },
            { label: t('finance.failedPayments.paymentStatus'), value: booking.payment_status },
            { label: t('finance.failedPayments.finalizeState'), value: booking.finalize_state },
            { label: t('finance.failedPayments.bookingExists'), value: booking.exists ? yes : no },
            { label: t('finance.failedPayments.bookedPaymentId'), value: booking.booked_razorpay_payment_id },
            { label: t('finance.failedPayments.needsRefundFlag'), value: booking.needs_refund ? yes : no },
            { label: t('finance.failedPayments.paidAt'), value: when(booking.paid_at, formatDateTime) },
          ]}
        />
        <DetailCard
          title={t('finance.failedPayments.userSection')}
          testId="failed-payment-user-card"
          lines={[
            { label: t('finance.failedPayments.userName'), value: user.name },
            { label: t('finance.failedPayments.userEmail'), value: user.email },
            { label: t('finance.failedPayments.userPhone'), value: user.phone },
          ]}
        />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <DetailCard
          title={t('finance.failedPayments.errorSection')}
          testId="failed-payment-error-card"
          lines={[
            { label: t('finance.failedPayments.errorCode'), value: error?.code },
            { label: t('finance.failedPayments.errorDescription'), value: error?.description },
            { label: t('finance.failedPayments.errorReason'), value: error?.reason },
            { label: t('finance.failedPayments.errorSource'), value: error?.source },
            { label: t('finance.failedPayments.errorStep'), value: error?.step },
            { label: t('finance.failedPayments.errorReportedBy'), value: error?.reported_by },
            { label: t('finance.failedPayments.errorAt'), value: when(error?.at, formatDateTime) },
          ]}
        />
        <DetailCard
          title={t('finance.failedPayments.retrySection')}
          testId="failed-payment-retry-card"
          lines={[
            { label: t('finance.failedPayments.attempts'), value: String(detail.attempts) },
            { label: t('finance.failedPayments.retryShown'), value: detail.retry_shown ? yes : no },
            { label: t('finance.failedPayments.sources'), value: detail.sources.join(', ') },
            { label: t('finance.failedPayments.createdAt'), value: when(detail.created_at, formatDateTime) },
          ]}
        />
      </Stack>
    </Stack>
  );
}
