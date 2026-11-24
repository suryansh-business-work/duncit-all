import { Text, XStack, YStack } from 'tamagui';
import { placeChargesTotal, type PodPlaceCharge } from '@duncit/utils';

import { formatMoney } from '@/utils/checkout-math';

interface Props {
  charges: readonly PodPlaceCharge[];
  currency: string;
  /** The total row's label — checkout says "venue", Pod Details says "place". */
  totalLabel: string;
}

/** The venue-side charges, one row each, and their total. Shared by the
 * checkout's info sheet and the confirmation asked before Join / Book.
 * mWeb twin: pages/checkout-page/VenueChargesList. */
export function VenueChargesList({ charges, currency, totalLabel }: Readonly<Props>) {
  return (
    <YStack gap={8}>
      {charges.map((charge) => (
        <XStack
          key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
          testID="venue-charge-row"
          justifyContent="space-between"
          gap={12}
        >
          <YStack flex={1}>
            <Text fontSize={13} fontWeight="700" color="$color">
              {charge.label}
            </Text>
            {charge.note ? (
              <Text fontSize={11.5} color="$muted">
                {charge.note}
              </Text>
            ) : null}
          </YStack>
          <Text fontSize={13} fontWeight="600" color="$color">
            {formatMoney(currency, charge.amount)}
          </Text>
        </XStack>
      ))}
      <YStack height={1} backgroundColor="$borderColor" marginVertical={2} />
      <XStack justifyContent="space-between">
        <Text fontSize={13} fontWeight="700" color="$color">
          {totalLabel}
        </Text>
        <Text testID="venue-charges-total" fontSize={13} fontWeight="700" color="$color">
          {formatMoney(currency, placeChargesTotal(charges))}
        </Text>
      </XStack>
    </YStack>
  );
}
