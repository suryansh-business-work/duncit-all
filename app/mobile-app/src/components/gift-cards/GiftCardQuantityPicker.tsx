import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { Field } from '@/components/Field';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The raw entry, so an emptied box stays empty while the buyer types. */
  value: string;
  max: number;
  error?: string;
  onChange: (next: string) => void;
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
  testID,
}: Readonly<{
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}>) {
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      width={44}
      height={44}
      borderRadius={22}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
      opacity={disabled ? 0.4 : 1}
      onPress={disabled ? undefined : onPress}
      {...PRESS_STYLE}
    >
      <MaterialIcons name={icon} size={22} />
    </YStack>
  );
}

/** How many cards — each worth the chosen amount — from 1 to the policy's maximum. mWeb twin: QuantityPicker. */
export function GiftCardQuantityPicker({ value, max, error, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const n = Number.parseInt(value, 10);
  const current = Number.isFinite(n) ? n : 1;
  const step = (by: number) => onChange(String(Math.min(max, Math.max(1, current + by))));
  const label = t('mweb.giftCards.quantityLabel');

  return (
    <SurfaceCard gap={12} testID="gift-card-quantity-picker">
      <SectionHeader title={t('mweb.giftCards.quantityHeading')} />
      <XStack gap={12} alignItems="flex-start">
        <StepButton
          testID="gift-card-quantity-minus"
          icon="remove"
          label={t('mweb.giftCards.quantityLess')}
          disabled={current <= 1}
          onPress={() => step(-1)}
        />
        <YStack flex={1}>
          <Field
            label={label}
            hint={t('mweb.giftCards.quantityHint', { vars: { max } })}
            error={error}
            testID="gift-card-quantity"
          >
            <Input
              testID="gift-card-quantity-input"
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
              aria-label={label}
            />
          </Field>
        </YStack>
        <StepButton
          testID="gift-card-quantity-plus"
          icon="add"
          label={t('mweb.giftCards.quantityMore')}
          disabled={current >= max}
          onPress={() => step(1)}
        />
      </XStack>
    </SurfaceCard>
  );
}
