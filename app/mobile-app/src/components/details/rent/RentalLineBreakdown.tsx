import { Text, YStack } from 'tamagui';
import { rentalLinePrice, rentalMoney, type PodRentalItem } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: PodRentalItem;
  quantity: number;
  /** The pod's chargeable hours, as the server counts them (catalogue.hours). */
  hours: number;
  currency: string;
}

/** How one picked item's price is made: rate × hours × qty, and the refundable deposit on its own line. RN twin of mWeb's RentalLineBreakdown. */
export function RentalLineBreakdown({ item, quantity, hours, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const line = rentalLinePrice(item, quantity, hours);
  if (line.quantity <= 0) return null;
  const money = (amount: number) => rentalMoney(currency, amount);
  const rentVars = { rate: money(item.rate), quantity: line.quantity, amount: money(line.rent) };
  const rent =
    item.unit === 'HOUR'
      ? t('venueRentals.guest.rentMathHour', { count: line.units, vars: rentVars })
      : t('venueRentals.guest.rentMathSlot', { vars: rentVars });
  return (
    <YStack marginTop={4} testID={`pod-rent-math-${item.id}`}>
      <Text fontSize={12} color="$muted">
        {rent}
      </Text>
      {line.deposit > 0 ? (
        <Text fontSize={12} color="$muted">
          {t('venueRentals.guest.depositMath', {
            vars: { rate: money(item.deposit), quantity: line.quantity, amount: money(line.deposit) },
          })}
        </Text>
      ) : null}
    </YStack>
  );
}
