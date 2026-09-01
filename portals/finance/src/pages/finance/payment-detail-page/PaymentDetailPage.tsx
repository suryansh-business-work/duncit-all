import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useDateFormat, useTranslation, type DateFormatter } from '@duncit/app-settings';
import PaymentDetailHeader from './PaymentDetailHeader';
import AmountBreakupCard from './AmountBreakupCard';
import PaymentSection from './PaymentSection';
import CheckoutTabs from './CheckoutTabs';
import CoinsCard from './CoinsCard';
import CouponCard from './CouponCard';
import CustomerCard from './CustomerCard';
import { useRetrySteps } from './useRetrySteps';
import { PAYMENT_DETAIL, type PaymentDetail } from './queries';

interface Props {
  detail: PaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * The audit, ordered by what Finance reads first: what went wrong, what was
 * charged, what every checkout owes, and only then the purchase itself — split
 * into one tab per thing checkout can sell.
 */
function PaymentDetailBody({ detail, formatDateTime }: Readonly<Props>) {
  const p = detail.payment;
  const twoUp = { xs: 'column', md: 'row' } as const;
  const { retry, busyKey } = useRetrySteps(p.id);
  const retryStep = useCallback((stepKey: string) => retry(stepKey), [retry]);
  const retryAll = useCallback(() => retry(null), [retry]);

  return (
    <Box>
      <PaymentDetailHeader
        detail={detail}
        busyKey={busyKey}
        onRetryAll={retryAll}
        formatDateTime={formatDateTime}
      />

      <Stack spacing={2}>
        <Stack direction={twoUp} spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          <AmountBreakupCard detail={detail} />
          <CoinsCard
            coins={detail.coins}
            coinsRedeemed={detail.coins_redeemed}
            coinsEarned={detail.coins_earned}
            formatDateTime={formatDateTime}
          />
        </Stack>

        <PaymentSection
          detail={detail}
          busyKey={busyKey}
          onRetry={retryStep}
          formatDateTime={formatDateTime}
        />

        <CheckoutTabs
          detail={detail}
          busyKey={busyKey}
          onRetry={retryStep}
          formatDateTime={formatDateTime}
        />

        <Stack direction={twoUp} spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          {detail.coupon && <CouponCard coupon={detail.coupon} currencySymbol={p.currency_symbol} />}
          <CustomerCard payment={p} />
        </Stack>
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
