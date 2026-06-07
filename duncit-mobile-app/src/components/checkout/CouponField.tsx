import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import type { CouponPreview } from '@/hooks/useCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  code: string;
  setCode: (value: string) => void;
  applied: CouponPreview | null;
  error: string | null;
  applying: boolean;
  currency: string;
  onApply: () => void;
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
  onApply,
  onRemove,
}: Props) {
  const { primary } = useThemeColors();

  if (applied?.ok) {
    return (
      <XStack
        testID="coupon-applied"
        alignItems="center"
        justifyContent="space-between"
        padding={12}
        borderRadius={12}
        backgroundColor="rgba(34,197,94,0.15)"
        borderWidth={1}
        borderColor="#22c55e"
      >
        <XStack alignItems="center" gap={8} flex={1}>
          <MaterialIcons name="local-offer" size={16} color="#22c55e" />
          <Text fontSize={13.5} fontWeight="800" color="$color">
            {applied.code} · −{currency}
            {applied.discount_amount}
          </Text>
        </XStack>
        <XStack
          testID="coupon-remove"
          role="button"
          aria-label="Remove coupon"
          onPress={onRemove}
          pressStyle={{ opacity: 0.6 }}
        >
          <Text fontSize={13} fontWeight="800" color="$primary">
            Remove
          </Text>
        </XStack>
      </XStack>
    );
  }

  return (
    <YStack gap={6}>
      <XStack gap={8} alignItems="center">
        <Input
          testID="coupon-input"
          flex={1}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="Coupon code"
          placeholderTextColor="$muted"
          autoCapitalize="characters"
          onSubmitEditing={onApply}
        />
        <XStack
          testID="coupon-apply"
          role="button"
          aria-label="Apply coupon"
          onPress={onApply}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={16}
          height={44}
          borderRadius={10}
          borderWidth={1}
          borderColor="$primary"
          opacity={applying || !code.trim() ? 0.5 : 1}
          pressStyle={{ opacity: 0.8 }}
        >
          {applying ? (
            <Spinner color={primary} />
          ) : (
            <Text fontSize={14} fontWeight="800" color="$primary">
              Apply
            </Text>
          )}
        </XStack>
      </XStack>
      {error ? (
        <Text testID="coupon-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
