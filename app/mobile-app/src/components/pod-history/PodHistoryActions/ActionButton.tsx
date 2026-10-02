import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function ActionButton({
  testID,
  icon,
  label,
  onPress,
  variant = 'outlined',
  disabled = false,
  onDisabledPress,
}: Readonly<{
  testID: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'contained' | 'outlined' | 'danger';
  disabled?: boolean;
  /** Runs instead of onPress while disabled — a dead control that says why it
   * is dead beats one that swallows the tap in silence. */
  onDisabledPress?: () => void;
}>) {
  const { onPrimary, color, danger, primary } = useThemeColors();
  const contained = variant === 'contained';
  const labelTint = contained ? onPrimary : color;
  const iconTint = contained ? onPrimary : primary;
  const tint = variant === 'danger' ? danger : labelTint;

  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      onPress={() => {
        if (disabled) onDisabledPress?.();
        else onPress();
      }}
      alignItems="center"
      justifyContent="center"
      gap={6}
      height={42}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={contained ? 0 : 1}
      borderColor={variant === 'danger' ? '$danger' : '$borderColor'}
      backgroundColor={contained ? '$primary' : 'transparent'}
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={16} color={variant === 'danger' ? danger : iconTint} />
      <Text fontSize={13} fontWeight="600" color={tint}>
        {label}
      </Text>
    </XStack>
  );
}
