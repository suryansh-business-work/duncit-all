import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { InfoRow } from '@duncit/ui';
import {
  rentalGatewayStatusKey,
  rentalRefundSourceKey,
  type RentalBookingRow,
  type RentalPaymentInfo,
  type RentalRefundAttempt,
} from '@duncit/utils';
import DetailSection, { type DetailField } from './DetailSection';
import { bookingMoney, orNotProvided, when } from './format';

type Money = Pick<RentalBookingRow, 'currency_symbol'>;

/** One Razorpay refund. The ids, attempts and errors are Finance's, for reconciling with the Razorpay dashboard. */
function RefundAttempt({ attempt, money, finance }: Readonly<{ attempt: RentalRefundAttempt; money: Money; finance: boolean }>) {
  const { t } = useTranslation();
  const rows: DetailField[] = [
    { key: 'amount', label: t('venueRentals.detail.refundAmount'), value: bookingMoney(money, attempt.amount) },
    { key: 'requested', label: t('venueRentals.detail.requestedAt'), value: when(attempt.requested_at) },
    { key: 'processed', label: t('venueRentals.detail.processedAt'), value: when(attempt.processed_at) },
  ];
  if (finance) {
    rows.push(
      { key: 'razorpay-id', label: t('venueRentals.detail.razorpayRefundId'), value: orNotProvided(t, attempt.razorpay_refund_id) },
      { key: 'attempts', label: t('venueRentals.detail.attempts'), value: attempt.attempts }
    );
    if (attempt.last_error) rows.push({ key: 'last-error', label: t('venueRentals.detail.lastError'), value: attempt.last_error });
  }
  return (
    <Box
      component="li"
      data-testid="rental-detail-refund-attempt"
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, listStyle: 'none' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t(rentalRefundSourceKey(attempt.source))}
        </Typography>
        <Chip size="small" variant="outlined" label={t(rentalGatewayStatusKey(attempt.status))} />
      </Stack>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {rows.map((row) => (
          <InfoRow key={row.key} label={row.label} value={row.value} />
        ))}
      </Box>
    </Box>
  );
}

/** Every Razorpay refund carrying this rental's money: its own, or the pod cancellation's that returned it. */
export function RentalRefundsSection({
  refunds,
  money,
  finance,
}: Readonly<{ refunds: RentalRefundAttempt[]; money: Money; finance: boolean }>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('venueRentals.detail.refunds')} testId="rental-detail-refunds">
      {refunds.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('venueRentals.detail.noRefunds')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0 }}>
          {refunds.map((attempt) => (
            <RefundAttempt key={attempt.id} attempt={attempt} money={money} finance={finance} />
          ))}
        </Stack>
      )}
    </DetailSection>
  );
}

/** The payment the rental rode on. Finance only: the server sends none to the venue. */
export function RentalPaymentSection({ payment, money }: Readonly<{ payment: RentalPaymentInfo; money: Money }>) {
  const { t } = useTranslation();
  const fields: DetailField[] = [
    { key: 'ref', label: t('venueRentals.table.payment'), value: payment.payment_ref },
    { key: 'gateway', label: t('venueRentals.detail.gateway'), value: orNotProvided(t, payment.gateway) },
    {
      key: 'razorpay-id',
      label: t('venueRentals.detail.razorpayPaymentId'),
      value: orNotProvided(t, payment.razorpay_payment_id),
    },
    { key: 'total', label: t('venueRentals.detail.paymentTotal'), value: bookingMoney(money, payment.total) },
    { key: 'paid-at', label: t('venueRentals.detail.paidAt'), value: when(payment.paid_at) },
  ];
  return <DetailSection title={t('venueRentals.detail.payment')} testId="rental-detail-payment" fields={fields} />;
}
