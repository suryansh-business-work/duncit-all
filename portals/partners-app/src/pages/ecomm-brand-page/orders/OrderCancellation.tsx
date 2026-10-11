import { Alert, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DetailSection, Fact } from '../returns/ReturnDetailSections';
import { REFUND_STATUS_COLORS, refundAmount, refundStatusLabel } from './order-labels';
import type { OrderRow } from './orders.queries';

/**
 * A cancelled order's story: when and why it was called off, and where the
 * buyer's money stands — what went back to the original payment, what went
 * back as Duncit Coins, Razorpay's reference, and the reason when it failed.
 * Nothing for a live order.
 */
export default function OrderCancellation({ row }: Readonly<{ row: OrderRow }>) {
  const { t } = useTranslation();
  if (!row.cancelled_at) return null;
  const { refund } = row;
  const owed = refund.status !== 'NONE';
  return (
    <DetailSection title={t('partners.orders.cancelledHeading')}>
      <Stack spacing={0.5} data-testid="order-cancellation">
        <Fact label={t('partners.orders.cancelledOn')} value={formatDateTime(row.cancelled_at)} />
        <Fact label={t('partners.orders.cancelledReason')} value={row.cancel_reason} />
        <Fact label={t('partners.deletionRefunds.colRequest')} value={row.deletion_request_no} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('partners.orders.refundStatus')}:
          </Typography>
          <StatusChip status={refund.status} colorMap={REFUND_STATUS_COLORS} label={refundStatusLabel(refund.status, t)} />
        </Stack>
        {owed && refund.amount > 0 && <Fact label={t('partners.orders.refundAmount')} value={refundAmount(row)} />}
        {owed && refund.coins > 0 && <Fact label={t('partners.orders.refundCoins')} value={refund.coins} />}
        <Fact label={t('partners.orders.refundRef')} value={refund.razorpay_refund_id} />
        <Fact label={t('partners.orders.refundedOn')} value={refund.refunded_at ? formatDateTime(refund.refunded_at) : ''} />
        {refund.status === 'FAILED' && refund.error && (
          <Alert severity="error">
            {t('partners.orders.refundError')}: {refund.error}
          </Alert>
        )}
      </Stack>
    </DetailSection>
  );
}
