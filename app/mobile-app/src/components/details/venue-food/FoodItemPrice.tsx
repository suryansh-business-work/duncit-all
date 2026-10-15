import { Text, XStack } from 'tamagui';
import {
  foodPriceDisplay,
  foodSavingLabel,
  formatFoodMoney,
  type FoodPriceSource,
  type FoodSavingAudience,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: FoodPriceSource & { id: string };
  currency: string;
  opacity?: number;
  /** A guest on the menu, or the owner previewing a dish on the menu desk. */
  audience?: FoodSavingAudience;
}

/**
 * A dish's price — and, when the owner set an MRP above it, that MRP struck
 * through with the saving beside it. The decision is @duncit/utils'
 * `foodPriceDisplay`; the guest always pays the price shown first. Tamagui
 * twin of mWeb's food/FoodItemPrice.
 */
export function FoodItemPrice({
  item,
  currency,
  opacity = 1,
  audience = 'guest',
}: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = foodPriceDisplay(item);
  const money = (amount: number) => formatFoodMoney(amount, currency);

  return (
    <XStack alignItems="baseline" gap={6} flexWrap="wrap" opacity={opacity}>
      <Text fontSize={14} fontWeight="700" color="$color" testID={`food-item-price-${item.id}`}>
        {money(shown.price)}
      </Text>
      {shown.originalPrice === null ? null : (
        <>
          <Text
            fontSize={12}
            color="$muted"
            textDecorationLine="line-through"
            aria-label={t('mweb.venueFood.originalPrice', {
              vars: { amount: money(shown.originalPrice) },
            })}
            testID={`food-item-original-price-${item.id}`}
          >
            {money(shown.originalPrice)}
          </Text>
          <Text
            fontSize={12}
            fontWeight="700"
            color="$success"
            testID={`food-item-saving-${item.id}`}
          >
            {foodSavingLabel(t, shown.saving, money, audience)}
          </Text>
        </>
      )}
    </XStack>
  );
}
