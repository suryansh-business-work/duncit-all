import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatFoodMoney, type AvailableVenueFoodCoupon } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import type { FoodCart } from '@/hooks/useFoodCart';
import type { FoodCouponBox } from '@/hooks/useFoodCoupon';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchAvailableFoodCoupons } from '@/services/food-order';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  venueId: string;
  box: FoodCouponBox;
  cart: FoodCart;
  currency: string;
  disabled: boolean;
}

/**
 * The venue's coupons a guest can pick from, above the code field — each with
 * what it gives and needs, and one press to apply it through the same check a
 * typed code goes through. Hidden once a code is applied, and when the venue
 * has none to offer. Tamagui twin of mWeb's food/FoodCouponOffers.
 */
export function FoodCouponOffers({ venueId, box, cart, currency, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { success } = useThemeColors();
  const [offers, setOffers] = useState<AvailableVenueFoodCoupon[]>([]);

  useEffect(() => {
    let live = true;
    fetchAvailableFoodCoupons(venueId)
      .then((list) => {
        if (live) setOffers(list);
      })
      // The list is a convenience: without it the code field still takes a code.
      .catch((error: unknown) =>
        logs.mobileApp.warn('venueFood', 'availableCoupons', { error, venueId }),
      );
    return () => {
      live = false;
    };
  }, [venueId]);

  if (cart.coupon || offers.length === 0) return null;

  return (
    <YStack gap={8} testID="food-coupon-offers">
      <Text role="heading" fontSize={14} fontWeight="600" color="$color">
        {t('mweb.venueFood.coupon.offersTitle')}
      </Text>
      {offers.map((offer) => (
        <XStack
          key={offer.code}
          testID={`food-coupon-offer-${offer.code}`}
          alignItems="center"
          gap={8}
          padding={10}
          borderRadius={8}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <MaterialIcons name="local-offer" size={18} color={success} />
          <YStack flex={1} gap={2}>
            <Text fontSize={14} fontWeight="700" color="$color">
              {`${offer.code} · ${t('mweb.venueFood.coupon.offerPct', { vars: { pct: String(offer.discount_pct) } })}`}
            </Text>
            {offer.description ? (
              <Text fontSize={12} color="$muted">
                {offer.description}
              </Text>
            ) : null}
            {offer.min_order_amount > 0 ? (
              <Text fontSize={12} color="$muted">
                {t('mweb.venueFood.coupon.offerMin', {
                  vars: { amount: formatFoodMoney(offer.min_order_amount, currency) },
                })}
              </Text>
            ) : null}
            {offer.valid_until ? (
              <Text fontSize={12} color="$muted">
                {t('mweb.venueFood.coupon.offerUntil', {
                  vars: { date: formatDate(offer.valid_until) },
                })}
              </Text>
            ) : null}
          </YStack>
          <DuncitButton
            testID={`food-coupon-offer-apply-${offer.code}`}
            label={t('mweb.venueFood.coupon.apply')}
            accessibilityLabel={t('mweb.venueFood.coupon.offerApply', {
              vars: { code: offer.code },
            })}
            variant="outline"
            size="sm"
            disabled={disabled || box.applying}
            onPress={() => fireAndForget(box.apply(offer.code))}
          />
        </XStack>
      ))}
    </YStack>
  );
}
