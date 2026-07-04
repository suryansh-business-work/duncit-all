import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

const PRESSED_OPACITY = 0.85;

/** Press feedback style: the caller's style plus a dim while pressed. Extracted
 * so both pressed states are unit-testable (RTL can't drive Pressable state). */
export const pressedOpacityStyle = (
  style: StyleProp<ViewStyle>,
  pressed: boolean,
): StyleProp<ViewStyle> => [style, { opacity: pressed ? PRESSED_OPACITY : 1 }];

interface PressScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * App-wide press feedback: dims to 0.85 while pressed. The former spring
 * scale-down animation was removed app-wide for performance — the feedback is
 * now an instant opacity change on a plain Pressable.
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
