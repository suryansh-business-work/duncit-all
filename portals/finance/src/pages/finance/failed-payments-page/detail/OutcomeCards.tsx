import { Stack } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { fmt } from '../../payment-logs-page/helpers';
import DetailCard from './DetailCard';
import {
  REFUND_COLORS,
  RESOLUTION_COLORS,
  labelOf,
  refundLabels,
  resolutionLabels,
  reviewLabels,
} from '../labels';
import type { FailedPaymentDetail } from '../queries';

interface Props {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** Where the case ended up: the refund Razorpay holds, the review, the resolution and the buyer's ticket. */
export default function OutcomeCards({ detail, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const when = (iso: string | null | undefined) => (iso ? formatDateTime(iso) : '');
  const { refund, review, resolution, ticket } = detail;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <DetailCard
          title={t('finance.failedPayments.refundSection')}
          testId="failed-payment-refund-card"
          lines={[
            {
              label: t('finance.failedPayments.refundStatus'),
              value: <StatusChip status={refund.status} label={labelOf(refundLabels(t), refund.status)} colorMap={REFUND_COLORS} />,
            },
            { label: t('finance.failedPayments.refundableAmount'), value: detail.refundable_amount == null ? '' : fmt(detail.refundable_amount, detail.currency_symbol) },
            { label: t('finance.failedPayments.refundAmount'), value: refund.amount == null ? '' : fmt(refund.amount, detail.currency_symbol) },
            { label: t('finance.failedPayments.razorpayRefundId'), value: refund.razorpay_refund_id },
            { label: t('finance.failedPayments.refundPaymentId'), value: refund.razorpay_payment_id },
            { label: t('finance.failedPayments.refundAttemptedAt'), value: when(refund.attempted_at) },
            { label: t('finance.failedPayments.refundedAt'), value: when(refund.refunded_at) },
            { label: t('finance.failedPayments.refundInitiatedBy'), value: refund.initiated_by_name },
            { label: t('finance.failedPayments.refundError'), value: refund.error },
          ]}
        />
        <DetailCard
          title={t('finance.failedPayments.reviewSection')}
          testId="failed-payment-review-card"
          lines={[
            { label: t('finance.failedPayments.reviewDecision'), value: labelOf(reviewLabels(t), review?.decision) },
            { label: t('finance.failedPayments.reviewNote'), value: review?.note },
            { label: t('finance.failedPayments.reviewBy'), value: review?.by_name },
            { label: t('finance.failedPayments.reviewAt'), value: when(review?.at) },
          ]}
        />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <DetailCard
          title={t('finance.failedPayments.resolutionSection')}
          testId="failed-payment-resolution-card"
          lines={[
            {
              label: t('finance.failedPayments.resolutionState'),
              value: <StatusChip status={resolution.state} label={labelOf(resolutionLabels(t), resolution.state)} colorMap={RESOLUTION_COLORS} />,
            },
            { label: t('finance.failedPayments.resolutionNote'), value: resolution.note },
            { label: t('finance.failedPayments.resolutionBy'), value: resolution.by_name },
            { label: t('finance.failedPayments.resolutionAt'), value: when(resolution.at) },
          ]}
        />
        <DetailCard
          title={t('finance.failedPayments.ticketSection')}
          testId="failed-payment-ticket-card"
          lines={
            ticket
              ? [
                  { label: t('finance.failedPayments.ticketNo'), value: ticket.ticket_no },
                  { label: t('finance.failedPayments.ticketStatus'), value: ticket.status },
                ]
              : [{ label: t('finance.failedPayments.ticketNo'), value: t('finance.failedPayments.noTicket') }]
          }
        />
      </Stack>
    </Stack>
  );
}
