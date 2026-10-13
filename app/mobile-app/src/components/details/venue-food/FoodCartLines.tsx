import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';
import { FOOD_ORDER_LIMITS, formatFoodMoney } from '@duncit/utils';

import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import type { FoodCart } from '@/hooks/useFoodCart';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { DietMark } from './DietMark';

interface Props {
  cart: FoodCart;
  currency: string;
  /** A payment is in flight: the cart it is paying for must not change under it. */
  disabled: boolean;
}

/** The cart's dishes: each with its diet mark, quantity × price, the cart control and a remove. */
export function FoodCartLines({ cart, currency, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  return (
    <YStack role="list" gap={12}>
      {cart.lines.map(({ item, quantity }) => (
        <XStack
          key={item.id}
          role="listitem"
          testID={`food-cart-line-${item.id}`}
          alignItems="center"
          gap={8}
        >
          <DietMark diet={item.diet} />
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {item.name}
            </Text>
            <Text fontSize={12} color="$muted">
              {t('mweb.venueFood.cart.qtyPrice', {
                vars: { qty: String(quantity), price: formatFoodMoney(item.price, currency) },
              })}
            </Text>
          </YStack>
          <CartQuantityControl
            quantity={quantity}
            max={FOOD_ORDER_LIMITS.maxQuantity}
            labels={cartControlLabels(t, item.name)}
            onChange={(next) => cart.setQuantity(item.id, next)}
            disabled={disabled}
            testIdPrefix={`food-cart-stepper-${item.id}`}
            testIds={{ count: `food-cart-stepper-${item.id}-value` }}
          />
          <XStack
            testID={`food-cart-remove-${item.id}`}
            role="button"
            tabIndex={0}
            aria-label={t('mweb.venueFood.removeItem', { vars: { name: item.name } })}
            aria-disabled={disabled}
            onPress={disabled ? undefined : () => cart.setQuantity(item.id, 0)}
            width={TOUCH_TARGET}
            height={TOUCH_TARGET}
            borderRadius={999}
            alignItems="center"
            justifyContent="center"
            opacity={disabled ? DISABLED_OPACITY : 1}
            pressStyle={disabled ? undefined : PRESS_STYLE.control}
          >
            <MaterialIcons name="delete-outline" size={20} color={muted} />
          </XStack>
        </XStack>
      ))}
    </YStack>
  );
}
