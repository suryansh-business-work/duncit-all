import { Text, YStack } from 'tamagui';
import { rentalLineCopy, type PodRentalCatalogue, type PodRentalItem } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: PodRentalItem;
  quantity: number;
  catalogue: Pick<PodRentalCatalogue, 'hours' | 'currency_symbol'>;
}

/** How one picked item's price is made, and the refundable deposit on its own line. RN twin of mWeb's RentalLineBreakdown. */
export function RentalLineBreakdown({ item, quantity, catalogue }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = rentalLineCopy(t, item, quantity, catalogue);
  if (!copy) return null;
  return (
    <YStack marginTop={4} testID={`pod-rent-math-${item.id}`}>
      <Text fontSize={12} color="$muted">
        {copy.rent}
      </Text>
      {copy.deposit ? (
        <Text fontSize={12} color="$muted">
          {copy.deposit}
        </Text>
      ) : null}
    </YStack>
  );
}
