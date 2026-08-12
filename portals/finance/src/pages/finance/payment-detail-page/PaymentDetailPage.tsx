import { useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { Box, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useDateFormat, useTranslation, type DateFormatter } from '@duncit/app-settings';
import PaymentDetailHeader from './PaymentDetailHeader';
import AmountBreakupCard from './AmountBreakupCard';
import ArtifactsTable from './ArtifactsTable';
import StepsTimeline from './StepsTimeline';
import CoinsCard from './CoinsCard';
import CouponCard from './CouponCard';
import PodBookingCard from './PodBookingCard';
import ProductOrdersTable from './ProductOrdersTable';
import CustomerCard from './CustomerCard';
import { PAYMENT_DETAIL, type PaymentDetail } from './queries';

interface Props {
  detail: PaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * The audit, ordered by what Finance reads first: what went wrong, what was
 * charged, what exists, and only then how it got there.
 */
function PaymentDetailBody({ detail, formatDateTime }: Readonly<Props>) {
  const p = detail.payment;
  const twoUp = { xs: 'column', md: 'row' } as const;
  // Both cards are conditional; the row itself only exists when one of them does.
  const hasBookingRow = Boolean(detail.pod_booking ?? detail.coupon);

  return (
    <Box>
      <PaymentDetailHeader detail={detail} formatDateTime={formatDateTime} />

      <Stack spacing={2}>
        <Stack direction={twoUp} spacing={2} alignItems="flex-start">
          <AmountBreakupCard detail={detail} />
          <CoinsCard
            coins={detail.coins}
            coinsRedeemed={detail.coins_redeemed}
            coinsEarned={detail.coins_earned}
            formatDateTime={formatDateTime}
          />
        </Stack>

        <ArtifactsTable artifacts={detail.artifacts} />

        <StepsTimeline
          steps={detail.steps}
          finalizeAttempts={detail.finalize_attempts}
          formatDateTime={formatDateTime}
        />

        {hasBookingRow && (
          <Stack direction={twoUp} spacing={2} alignItems="flex-start">
            {detail.pod_booking && (
              <PodBookingCard booking={detail.pod_booking} formatDateTime={formatDateTime} />
            )}
            {detail.coupon && <CouponCard coupon={detail.coupon} currencySymbol={p.currency_symbol} />}
          </Stack>
        )}

        {detail.product_orders.length > 0 && (
          <ProductOrdersTable orders={detail.product_orders} currencySymbol={p.currency_symbol} />
        )}

        <CustomerCard payment={p} />
      </Stack>
    </Box>
  );
}

/** Finance › Payment Logs › one payment: everything checkout charged and created. */
export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatDateTime } = useDateFormat();
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ paymentDetail: PaymentDetail }>(PAYMENT_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const detail = data?.paymentDetail;

  return (
    <QueryGuard
      loading={loading && !detail}
      error={error}
      notFound={!detail}
      notFoundText={t('finance.payment.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        if (!detail) return null;
        return <PaymentDetailBody detail={detail} formatDateTime={formatDateTime} />;
      }}
    </QueryGuard>
  );
}
