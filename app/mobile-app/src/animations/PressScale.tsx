import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { PRESS } from '@duncit/buttons-native';

/** Press feedback style: the caller's style plus the shared pressed treatment.
 * Extracted so both states stay unit-testable (RTL cannot drive Pressable state). */
export const pressedOpacityStyle = (
  style: StyleProp<ViewStyle>,
  pressed: boolean,
): StyleProp<ViewStyle> => [
  style,
  pressed
    ? { opacity: PRESS.control.opacity, transform: [{ scale: PRESS.control.scale }] }
    : { opacity: 1 },
];

interface PressScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * App-wide press feedback for anything wrapping a plain `Pressable`.
 *
 * The values are `PRESS.control` from `@duncit/buttons-native` — the same
 * dim and compression an outlined button gets in mWeb, rather than the 0.85
 * that used to be written here and in 203 other places.
 */
export function PressScale({
  children,
  onPress,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: Readonly<PressScaleProps>) {
  return (
    <Pressable
      testID={testID}
      role="button"
      aria-label={accessibilityLabel}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => pressedOpacityStyle(style, pressed)}
    >
      {children}
    </Pressable>
  );
}
