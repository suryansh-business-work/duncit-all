import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { formatFoodMoney, type FoodCartPrice } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  price: FoodCartPrice;
  currency: string;
  onOpen: () => void;
}

/** How far the button floats in from the screen's bottom-right corner. */
const EDGE = 16;
const HEIGHT = 52;
const SHADOW_OFFSET = { width: 0, height: 6 };

/** What the venue's scroll adds to its bottom padding so its last row clears the button. */
export const FOOD_CART_BUTTON_SPACE = HEIGHT + EDGE;

/**
 * The cart, as a button floating over the venue's bottom-right corner while it
 * holds anything: a bag, how many dishes and what they come to — and the way
 * into the cart sheet. It is drawn inside the stack screen's safe area, which
 * already ends above the gesture bar (a pushed screen has no tab bar), so the
 * corner offset alone keeps it clear. Its name carries the count and the total
 * and is a live region, so each Add is heard as well as seen. Tamagui twin of
 * mWeb's food/FoodCartBar.
 */
export function FoodCartBar({ price, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  if (price.count <= 0) return null;
  const total = formatFoodMoney(price.total, currency);
  const single = price.count === 1;
  const count = String(price.count);
  return (
    <YStack testID="food-cart-bar" position="absolute" right={EDGE} bottom={EDGE}>
      <XStack
        testID="food-cart-bar-open"
        role="button"
        tabIndex={0}
        aria-live="polite"
        aria-label={
          single
            ? t('mweb.cartControl.foodCartOpenOne', { vars: { total } })
            : t('mweb.cartControl.foodCartOpenMany', { vars: { count, total } })
        }
        onPress={onOpen}
        alignItems="center"
        gap={10}
        minHeight={HEIGHT}
        paddingHorizontal={18}
        borderRadius={999}
        backgroundColor="$primary"
        shadowColor="$shadowColor"
        shadowOpacity={0.25}
        shadowRadius={12}
        shadowOffset={SHADOW_OFFSET}
        pressStyle={PRESS_STYLE.solid}
      >
        <MaterialIcons name="shopping-bag" size={22} color={onPrimary} />
        <YStack>
          <Text testID="food-cart-bar-summary" fontSize={13} fontWeight="700" color="$onPrimary">
            {single
              ? t('mweb.cartControl.foodCartOne')
              : t('mweb.cartControl.foodCartMany', { vars: { count } })}
          </Text>
          <Text testID="food-cart-bar-total" fontSize={12} fontWeight="600" color="$onPrimary">
            {total}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}
