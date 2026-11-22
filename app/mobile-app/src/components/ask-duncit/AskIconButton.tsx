import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  busy?: boolean;
  /** Filled primary circle (send, stop) instead of a bare glyph. */
  filled?: boolean;
  active?: boolean;
  size?: number;
}

/** The round icon button Ask Duncit's header, composer and bubbles share. */
export function AskIconButton({
  icon,
  label,
  onPress,
  testID,
  disabled,
  busy,
  filled,
  active,
  size = 22,
}: Readonly<Props>) {
  const { muted, onPrimary, primary } = useThemeColors();
  let tint = muted;
  if (filled) tint = onPrimary;
  else if (active) tint = primary;
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      aria-pressed={active}
      hitSlop={8}
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor={filled ? '$primary' : 'transparent'}
      opacity={disabled ? 0.45 : 1}
      pressStyle={filled ? PRESS_STYLE.surface : PRESS_STYLE.inline}
      onPress={disabled || busy ? undefined : onPress}
    >
      {busy ? (
        <Spinner size="small" color={tint} />
      ) : (
        <MaterialIcons name={icon} size={size} color={tint} />
      )}
    </XStack>
  );
}
