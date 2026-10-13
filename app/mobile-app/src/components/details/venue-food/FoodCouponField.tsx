import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';
import { FOOD_ORDER_LIMITS, formatFoodMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FIELD_HEIGHT, FIELD_RADIUS, Field } from '@/components/Field';
import type { FoodCart } from '@/hooks/useFoodCart';
import type { FoodCouponBox } from '@/hooks/useFoodCoupon';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  box: FoodCouponBox;
  cart: FoodCart;
  currency: string;
  /** A payment is in flight: the price it is paying must not change under it. */
  disabled: boolean;
  onRemove: () => void;
}

/** The applied code as a chip with its remove, and under it what it saves — or what the cart still lacks. */
function AppliedCoupon({ cart, currency, disabled, onRemove }: Readonly<Omit<Props, 'box'>>) {
  const { t } = useTranslation();
  const { success, muted, color: ink } = useThemeColors();
  const { coupon, price } = cart;
  if (!coupon) return null;
  const unmet = price.couponUnmet;
  // In paise, as the cart is priced, so the shortfall never shows a float's tail.
  const short = (Math.round(coupon.min_order_amount * 100) - price.subtotalPaise) / 100;
  return (
    <YStack gap={6} testID="food-coupon">
      <XStack
        testID="food-coupon-applied"
        alignItems="center"
        gap={8}
        paddingLeft={14}
        borderRadius={FIELD_RADIUS}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor={unmet ? '$soft' : '$successSoft'}
      >
        <MaterialIcons name="local-offer" size={18} color={unmet ? muted : success} />
        <Text testID="food-coupon-code" flex={1} fontSize={14} fontWeight="700" color="$color">
          {coupon.code}
        </Text>
        <XStack
          testID="food-coupon-remove"
          role="button"
          tabIndex={0}
          aria-label={t('mweb.venueFood.coupon.remove', { vars: { code: coupon.code } })}
          aria-disabled={disabled}
          onPress={disabled ? undefined : onRemove}
          width={TOUCH_TARGET}
          height={TOUCH_TARGET}
          borderRadius={999}
          alignItems="center"
          justifyContent="center"
          opacity={disabled ? DISABLED_OPACITY : 1}
          pressStyle={disabled ? undefined : PRESS_STYLE.control}
        >
          <MaterialIcons name="close" size={18} color={ink} />
        </XStack>
      </XStack>
      <Text testID="food-coupon-status" aria-live="polite" fontSize={12.5} color="$color">
        {unmet
          ? t('mweb.venueFood.coupon.unmet', {
              vars: { amount: formatFoodMoney(short, currency) },
            })
          : t('mweb.venueFood.coupon.applied', {
              vars: { code: coupon.code, amount: formatFoodMoney(price.coupon, currency) },
            })}
      </Text>
    </YStack>
  );
}

/**
 * The venue's coupon on the cart: a code box with Apply, which asks the server
 * what the code does to this cart — then either the applied code, or why it
 * was refused, said under the box. The line under either state is a live
 * region, so the answer is heard as well as seen. This is the venue's own
 * coupon; the Duncit coupon of the pod and store checkouts is another system
 * (components/checkout/CouponField).
 */
export function FoodCouponField({ box, cart, currency, disabled, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = t('mweb.venueFood.coupon.label');
  if (cart.coupon) {
    return (
      <AppliedCoupon cart={cart} currency={currency} disabled={disabled} onRemove={onRemove} />
    );
  }
  const locked = disabled || box.applying;
  const message = box.error ?? (box.removed ? t('mweb.venueFood.coupon.removed') : null);
  const apply = () => fireAndForget(box.apply());
  return (
    <YStack gap={6} testID="food-coupon">
      <Field label={label} testID="food-coupon-field">
        <XStack gap={8} alignItems="center">
          <Input
            testID="food-coupon-input"
            flex={1}
            size="$4"
            minHeight={FIELD_HEIGHT}
            borderRadius={FIELD_RADIUS}
            paddingHorizontal={16}
            backgroundColor="$surface"
            color="$color"
            placeholder={t('mweb.venueFood.coupon.placeholder')}
            placeholderTextColor="$muted"
            borderColor={box.error ? '$danger' : '$borderColor'}
            focusStyle={{ borderColor: box.error ? '$danger' : '$primary', borderWidth: 1.5 }}
            value={box.code}
            onChangeText={box.type}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={FOOD_ORDER_LIMITS.couponCodeMax}
            returnKeyType="done"
            onSubmitEditing={apply}
            aria-label={label}
            aria-invalid={!!box.error}
            // Tamagui's <Input> honours `readOnly`, not a passed `editable` (see FormTextField).
            readOnly={locked}
          />
          <DuncitButton
            testID="food-coupon-apply"
            label={
              box.applying ? t('mweb.venueFood.coupon.applying') : t('mweb.venueFood.coupon.apply')
            }
            variant="outline"
            loading={box.applying}
            disabled={disabled || !box.canApply}
            onPress={apply}
          />
        </XStack>
      </Field>
      <YStack aria-live="polite">
        {message ? (
          <Text
            testID={box.error ? 'food-coupon-error' : 'food-coupon-removed'}
            fontSize={12.5}
            color={box.error ? '$danger' : '$muted'}
          >
            {message}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
