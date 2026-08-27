import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import type { AvailableCoupon, CouponPreview } from '@/hooks/useCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Field } from '@/components/Field';
import { CouponsSheet } from '@/components/checkout/CouponsSheet';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  code: string;
  setCode: (value: string) => void;
  applied: CouponPreview | null;
  error: string | null;
  applying: boolean;
  currency: string;
  available: AvailableCoupon[];
  onApply: (code?: string) => void;
  onRemove: () => void;
}

/** Coupon entry for the payment step. Once a valid code is applied it collapses
 * to a success row showing the discount; the discounted total is shown by the
 * caller (strikethrough). */
export function CouponField({
  code,
  setCode,
  applied,
  error,
  applying,
  currency,
  available,
  onApply,
  onRemove,
}: Readonly<Props>) {
  const { primary, success } = useThemeColors();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const couponCodeLabel = t('mweb.checkout.couponCode');
  const availableLabel =
    available.length === 1
      ? t('mweb.checkout.couponsAvailableOne')
      : t('mweb.checkout.couponsAvailableMany', { count: available.length });
  // Same hex-alpha-suffix tint pattern as ClubTotalMembersSection — a 15% alpha
  // channel on the resolved success token (mirrors mWeb's alpha(success, 0.15)).
  const successTint = `${success}26`;

  if (applied?.ok) {
    return (
      <XStack
        testID="coupon-applied"
        alignItems="center"
        justifyContent="space-between"
        padding={12}
        borderRadius={12}
        backgroundColor={successTint}
        borderWidth={1}
        borderColor={success}
      >
        <XStack alignItems="center" gap={8} flex={1}>
          <MaterialIcons name="local-offer" size={16} color={success} />
          <Text fontSize={13.5} fontWeight="600" color="$color">
            {applied.code} · −{currency}
            {applied.discount_amount}
          </Text>
        </XStack>
        <XStack
          testID="coupon-remove"
          role="button"
          aria-label={t('mweb.checkout.couponRemoveAria')}
          onPress={onRemove}
          pressStyle={PRESS_STYLE.inline}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            {t('mweb.checkout.couponRemove')}
          </Text>
        </XStack>
      </XStack>
    );
  }

  return (
    <YStack gap={6}>
      <Field label={couponCodeLabel}>
        <XStack gap={8} alignItems="center">
          <Input
            testID="coupon-input"
            flex={1}
            value={code}
            onChangeText={(next) => setCode(next.toUpperCase())}
            placeholder={couponCodeLabel}
            placeholderTextColor="$muted"
            autoCapitalize="characters"
            aria-label={couponCodeLabel}
            onSubmitEditing={() => onApply()}
          />
          <XStack
            testID="coupon-apply"
            role="button"
            aria-label={t('mweb.checkout.couponApplyAria')}
            onPress={() => onApply()}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={16}
            height={44}
            borderRadius={10}
            borderWidth={1}
            borderColor="$primary"
            opacity={applying || !code.trim() ? 0.5 : 1}
            pressStyle={PRESS_STYLE.control}
          >
            {applying ? (
              <Spinner color={primary} />
            ) : (
              <Text fontSize={14} fontWeight="600" color="$primary">
                {t('mweb.checkout.couponApply')}
              </Text>
            )}
          </XStack>
        </XStack>
      </Field>
      {available.length > 0 ? (
        <XStack
          testID="coupon-view-available"
          role="button"
          aria-label={availableLabel}
          onPress={() => setSheetOpen(true)}
          alignSelf="flex-start"
          pressStyle={PRESS_STYLE.row}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            {availableLabel}
          </Text>
        </XStack>
      ) : null}
      {error ? (
        <Text testID="coupon-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <CouponsSheet
        open={sheetOpen}
        coupons={available}
        currency={currency}
        onClose={() => setSheetOpen(false)}
        onPick={(picked) => {
          setSheetOpen(false);
          setCode(picked);
          onApply(picked);
        }}
      />
    </YStack>
  );
}
