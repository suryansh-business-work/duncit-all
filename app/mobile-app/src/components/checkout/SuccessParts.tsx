import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface ActionButtonProps {
  testID: string;
  ariaLabel: string;
  busy: boolean;
  onPress: () => void;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  variant: 'filled' | 'outlined';
}

/** Stretched pill button with a busy spinner — used for ticket/invoice downloads. */
export function ActionButton({
  testID,
  ariaLabel,
  busy,
  onPress,
  label,
  iconName,
  variant,
}: Readonly<ActionButtonProps>) {
  const { onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const filled = variant === 'filled';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={busy}
      onPress={busy ? undefined : onPress}
      alignItems="center"
      justifyContent="center"
      gap={8}
      alignSelf="stretch"
      height={52}
      borderRadius={999}
      borderWidth={filled ? 0 : 1}
      borderColor="$primary"
      backgroundColor={filled ? '$primary' : undefined}
      opacity={busy ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner size="small" color={filled ? onPrimary : '$primary'} />
      ) : (
        <MaterialIcons name={iconName} size={18} color={filled ? onPrimary : primary} />
      )}
      <Text fontSize={15} fontWeight="600" color={filled ? onPrimary : '$primary'}>
        {busy ? t('mweb.checkout.preparing') : label}
      </Text>
    </XStack>
  );
}

/** One label · value line of the receipt card; `bold` is the amount paid. */
export function Row({
  label,
  value,
  bold,
}: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={12}>
      <Text fontSize={13} fontWeight={bold ? '700' : '500'} color={bold ? '$color' : '$muted'}>
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '700' : '600'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}
