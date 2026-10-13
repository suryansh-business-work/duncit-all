import { Text, XStack } from 'tamagui';
import { formatFoodMoney, type FoodCartPrice } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  price: FoodCartPrice;
  currency: string;
  onOpen: () => void;
}

/**
 * The cart, pinned under the venue's scroll while it holds anything: how many
 * dishes, what they come to, and the way into the cart. The screen's own safe
 * area keeps it clear of the gesture bar. The summary is a live region, so each
 * Add is heard as well as seen. Tamagui twin of mWeb's food/FoodCartBar.
 */
export function FoodCartBar({ price, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const items =
    price.count === 1
      ? t('mweb.venueFood.cart.itemsOne')
      : t('mweb.venueFood.cart.itemsMany', { vars: { count: String(price.count) } });
  return (
    <XStack
      testID="food-cart-bar"
      alignItems="center"
      justifyContent="space-between"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={12}
      borderTopWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text
        testID="food-cart-bar-summary"
        aria-live="polite"
        flex={1}
        fontSize={15}
        fontWeight="600"
        color="$color"
      >
        {t('mweb.venueFood.cart.barSummary', {
          vars: { items, total: formatFoodMoney(price.total, currency) },
        })}
      </Text>
      <DuncitButton
        testID="food-cart-bar-open"
        label={t('mweb.venueFood.cart.viewCart')}
        onPress={onOpen}
      />
    </XStack>
  );
}
