import { Input, Text, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  denominations: readonly number[];
  min: number;
  max: number;
  currency: string;
  /** The chip currently selected; null while a custom amount is being typed. */
  selected: number | null;
  customText: string;
  /** Range error for the custom amount; null while it is valid or empty. */
  error: string | null;
  onSelect: (amount: number) => void;
  onCustomChange: (text: string) => void;
}

/** The amount step of the buy page: preset chips from Finance > Gift Cards
 * plus a custom amount clamped to the configured bounds (rule 27 twin). */
export function GiftCardAmountPicker({
  denominations,
  min,
  max,
  currency,
  selected,
  customText,
  error,
  onSelect,
  onCustomChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const customLabel = t('mweb.giftCards.customAmountLabel');
  const rangeHint = t('mweb.giftCards.amountRangeHint', {
    vars: { min: formatMoney(currency, min), max: formatMoney(currency, max) },
  });

  return (
    <YStack gap={10}>
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('mweb.giftCards.amountHeading')}
      </Text>
      <XStack gap={8} flexWrap="wrap">
        {denominations.map((amount) => {
          const isActive = selected === amount && !customText;
          const label = formatMoney(currency, amount);
          return (
            <XStack
              key={amount}
              testID={`gift-card-amount-${amount}`}
              role="button"
              aria-label={label}
              onPress={() => onSelect(amount)}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={999}
              borderWidth={1}
              borderColor={isActive ? '$primary' : '$borderColor'}
              backgroundColor={isActive ? '$primary' : 'transparent'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={13} fontWeight="700" color={isActive ? '$onPrimary' : '$color'}>
                {label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
      <Field
        label={customLabel}
        hint={rangeHint}
        error={error ?? undefined}
        testID="gift-card-custom-amount"
      >
        <Input
          testID="gift-card-custom-amount-input"
          value={customText}
          onChangeText={onCustomChange}
          placeholder={customLabel}
          placeholderTextColor="$muted"
          keyboardType="numeric"
          aria-label={customLabel}
        />
      </Field>
    </YStack>
  );
}
