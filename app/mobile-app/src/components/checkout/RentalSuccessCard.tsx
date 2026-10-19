import { Text } from 'tamagui';
import { paymentRentalSummary, type PaymentRentalLine } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';

import { RentalCollectNotice, RentalItemLines } from './RentalCheckoutCard';

interface Props {
  /** The paid booking (its frozen `rental_lines`); null for a free join, which rents nothing. */
  payment: { currency_symbol: string; rental_lines?: readonly PaymentRentalLine[] | null } | null;
  /** Finance's rule: false means the venue keeps the deposit. */
  depositRefundable: boolean;
}

/** The confirmation's rented items, collected — and their deposits settled — at the venue. RN twin of mWeb's RentalSuccessCard. */
export function RentalSuccessCard({ payment, depositRefundable }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = paymentRentalSummary(payment?.rental_lines);
  if (!payment || items.length === 0) return null;
  return (
    <SurfaceCard alignSelf="stretch" gap={10} testID="checkout-success-rentals">
      <Text fontSize={14} fontWeight="700" color="$color" role="heading">
        {t('venueRentals.guest.bookedTitle')}
      </Text>
      <RentalItemLines
        lines={items}
        currency={payment.currency_symbol}
        depositRefundable={depositRefundable}
        testID="checkout-success-rental"
      />
      <RentalCollectNotice depositRefundable={depositRefundable} />
    </SurfaceCard>
  );
}
