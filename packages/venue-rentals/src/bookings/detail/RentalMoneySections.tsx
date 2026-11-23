import type { ReactNode } from 'react';
import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { rentalRefundStateOf, type RentalBookingRow } from '@duncit/utils';
import { rentalRefundEligible } from '../rental-booking-columns';
import { RentalRefundStateChip } from '../rental-chips';
import DetailSection, { type DetailField } from './DetailSection';
import { bookingMoney, depositPolicyText } from './format';

/** What the rental cost and who keeps what, frozen on the booking when it closed. */
export function RentalMoneySection({ booking }: Readonly<{ booking: RentalBookingRow }>) {
  const { t } = useTranslation();
  const fields: DetailField[] = [
    { key: 'rent', label: t('venueRentals.table.rent'), value: bookingMoney(booking, booking.rent_amount) },
    { key: 'deposit', label: t('venueRentals.table.deposit'), value: bookingMoney(booking, booking.deposit_amount) },
    { key: 'commission', label: t('venueRentals.table.commission'), value: bookingMoney(booking, booking.commission_amount) },
    { key: 'venue-amount', label: t('venueRentals.table.venueAmount'), value: bookingMoney(booking, booking.venue_amount) },
  ];
  if (booking.damage_claim > 0) {
    fields.push({ key: 'damage', label: t('venueRentals.table.damage'), value: bookingMoney(booking, booking.damage_claim) });
    if (booking.damage_note) fields.push({ key: 'damage-note', label: t('venueRentals.mark.note'), value: booking.damage_note });
  }
  const policy = depositPolicyText(t, booking.deposit_policy);
  if (policy) fields.push({ key: 'deposit-policy', label: t('venueRentals.detail.depositPolicy'), value: policy });
  return <DetailSection title={t('venueRentals.detail.money')} testId="rental-detail-money" fields={fields} />;
}

interface RefundProps {
  booking: RentalBookingRow;
  /** Finance's "Send refund via Razorpay", when this rental waits for it. */
  action?: ReactNode;
}

/**
 * Where the refund stands. Every amount is the server's: owed, in flight on
 * Razorpay, confirmed by Razorpay, and still outstanding.
 */
export function RentalRefundSection({ booking, action }: Readonly<RefundProps>) {
  const { t } = useTranslation();
  const fields: DetailField[] = [
    { key: 'eligible', label: t('venueRentals.table.refundEligible'), value: bookingMoney(booking, rentalRefundEligible(booking)) },
    { key: 'pending', label: t('venueRentals.table.refundPending'), value: bookingMoney(booking, booking.refund_pending) },
    { key: 'refunded', label: t('venueRentals.table.refunded'), value: bookingMoney(booking, booking.refunded_amount) },
    { key: 'outstanding', label: t('venueRentals.table.refundOutstanding'), value: bookingMoney(booking, booking.refund_outstanding) },
  ];
  const review = rentalRefundStateOf(booking) === 'REQUIRES_REVIEW';

  return (
    <DetailSection
      title={t('venueRentals.detail.refund')}
      testId="rental-detail-refund"
      action={<RentalRefundStateChip row={booking} />}
      fields={fields}
    >
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {review && booking.refund_review_reason && (
          <Alert severity="warning" data-testid="rental-detail-review-reason">
            <AlertTitle>{t('venueRentals.detail.reviewReason')}</AlertTitle>
            {booking.refund_review_reason}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary">
          {t('venueRentals.detail.gatewayNote')}
        </Typography>
        {action}
      </Stack>
    </DetailSection>
  );
}
