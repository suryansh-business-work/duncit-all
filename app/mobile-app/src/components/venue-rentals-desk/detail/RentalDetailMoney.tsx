import { Text, XStack, YStack } from 'tamagui';
import { rentalGatewayStatusKey, rentalMoney, rentalRefundSourceKey } from '@duncit/utils';

import { SummaryRow } from '@/components/checkout/SummaryRow';
import type { RentalDetail } from '@/hooks/useRentalBookingDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

import { DetailSection } from './DetailSection';
import { RentalRefundChip } from './RentalRefundChip';

type Booking = RentalDetail['booking'];

/** What the rental cost, what the venue earns and who returns the deposit. */
function MoneySection({ booking }: Readonly<{ booking: Booking }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(booking.currency_symbol, amount);
  const policy =
    booking.deposit_policy === 'VENUE_CASH'
      ? 'venueRentals.detail.depositPolicyVenue'
      : 'venueRentals.detail.depositPolicyDuncit';
  return (
    <DetailSection title={t('venueRentals.detail.money')} testID="rental-detail-money">
      <SummaryRow label={t('venueRentals.table.rent')} value={money(booking.rent_amount)} />
      <SummaryRow label={t('venueRentals.table.deposit')} value={money(booking.deposit_amount)} />
      {booking.damage_claim > 0 ? (
        <SummaryRow label={t('venueRentals.table.damage')} value={money(booking.damage_claim)} />
      ) : null}
      <SummaryRow
        label={t('venueRentals.table.venueAmount')}
        value={money(booking.venue_amount)}
        bold
      />
      {booking.deposit_amount > 0 && booking.deposit_policy ? (
        <SummaryRow
          label={t('venueRentals.detail.depositPolicy')}
          value={t(policy)}
          testID="rental-detail-deposit-policy"
        />
      ) : null}
    </DetailSection>
  );
}

/** Each Razorpay refund carrying the rental's money: its own, or the pod cancellation's. */
function RefundAttempts({ detail }: Readonly<{ detail: RentalDetail }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(detail.booking.currency_symbol, amount);
  if (detail.refunds.length === 0) {
    return (
      <Text fontSize={12.5} color="$muted" testID="rental-detail-no-refunds">
        {t('venueRentals.detail.noRefunds')}
      </Text>
    );
  }
  return (
    <YStack gap={8} role="list" aria-label={t('venueRentals.detail.refunds')}>
      {detail.refunds.map((refund) => (
        <YStack
          key={refund.id}
          role="listitem"
          gap={2}
          testID={`rental-detail-refund-${refund.id}`}
        >
          <XStack justifyContent="space-between" gap={8}>
            <Text fontSize={13} fontWeight="600" color="$color">
              {t(rentalRefundSourceKey(refund.source))}
            </Text>
            <Text fontSize={13} fontWeight="700" color="$color">
              {money(refund.amount)}
            </Text>
          </XStack>
          <Text fontSize={12} color="$muted">
            {`${t(rentalGatewayStatusKey(refund.status))} · ${formatDateTime(
              refund.processed_at ?? refund.requested_at ?? refund.created_at,
            )}`}
          </Text>
        </YStack>
      ))}
    </YStack>
  );
}

/** Where the deposit's Razorpay refund stands, in amounts, and every attempt. */
function RefundSection({ detail }: Readonly<{ detail: RentalDetail }>) {
  const { t } = useTranslation();
  const { booking } = detail;
  const money = (amount: number | null | undefined) =>
    rentalMoney(booking.currency_symbol, amount ?? 0);
  return (
    <DetailSection
      title={t('venueRentals.detail.refund')}
      testID="rental-detail-refund"
      action={<RentalRefundChip row={booking} testID="rental-detail-refund-state" />}
    >
      <SummaryRow
        label={t('venueRentals.table.refundEligible')}
        value={money(booking.refund_eligible)}
      />
      <SummaryRow
        label={t('venueRentals.table.refundPending')}
        value={money(booking.refund_pending)}
      />
      <SummaryRow
        label={t('venueRentals.table.refunded')}
        value={money(booking.refunded_amount)}
        testID="rental-detail-refunded"
      />
      <SummaryRow
        label={t('venueRentals.table.refundOutstanding')}
        value={money(booking.refund_outstanding)}
      />
      {booking.refund_review_reason ? (
        <YStack gap={2} testID="rental-detail-review-reason">
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('venueRentals.detail.reviewReason')}
          </Text>
          <Text fontSize={13} color="$color">
            {booking.refund_review_reason}
          </Text>
        </YStack>
      ) : null}
      <Text role="heading" fontSize={13} fontWeight="700" color="$color" marginTop={4}>
        {t('venueRentals.detail.refunds')}
      </Text>
      <RefundAttempts detail={detail} />
      <Text fontSize={12} color="$muted">
        {t('venueRentals.detail.gatewayNote')}
      </Text>
    </DetailSection>
  );
}

/** The money and refund cards of a rental's detail. */
export function RentalDetailMoney({ detail }: Readonly<{ detail: RentalDetail }>) {
  return (
    <>
      <MoneySection booking={detail.booking} />
      <RefundSection detail={detail} />
    </>
  );
}
