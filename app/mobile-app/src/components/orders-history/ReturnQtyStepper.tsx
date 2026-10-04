import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The line's display name — read out on the +/− buttons. */
  name: string;
  value: number;
  max: number;
  onChange: (qty: number) => void;
  testID: string;
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
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      width={TOUCH_TARGET}
      height={TOUCH_TARGET}
      borderRadius={999}
      alignItems="center"
      justifyContent="center"
      pressStyle={disabled ? undefined : PRESS_STYLE.surface}
      opacity={disabled ? DISABLED_OPACITY : 1}
      onPress={disabled ? undefined : onPress}
    >
      <MaterialIcons name={icon} size={18} color={disabled ? muted : primary} />
    </XStack>
  );
}

/** How many of one order line go back: − qty of max +, bounded to 0..max.
 * mWeb twin: forms/pod-shop-return/ReturnQtyStepper (rule 27). */
export function ReturnQtyStepper({ name, value, max, onChange, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack testID={testID} alignItems="center" gap={4}>
      <StepButton
        icon="remove"
        testID={`${testID}-minus`}
        label={t('mweb.podShopReturns.decreaseQty', { vars: { name } })}
        disabled={value <= 0}
        onPress={() => onChange(Math.max(0, value - 1))}
      />
      <Text
        testID={`${testID}-value`}
        aria-live="polite"
        fontSize={13}
        fontWeight="600"
        color="$color"
        paddingHorizontal={4}
      >
        {t('mweb.podShopReturns.qtyOf', { vars: { qty: String(value), max: String(max) } })}
      </Text>
      <StepButton
        icon="add"
        testID={`${testID}-plus`}
        label={t('mweb.podShopReturns.increaseQty', { vars: { name } })}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </XStack>
  );
}
