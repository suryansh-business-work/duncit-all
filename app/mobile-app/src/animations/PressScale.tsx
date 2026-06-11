import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { pressSpring } from '@/animations/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESSED_SCALE = 0.96;

interface PressScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * The app-wide press feedback: scales down to 0.96 on touch and springs back
 * on release — all on the UI thread. Wrap tappable cards, tabs and CTAs in
 * this for consistent, premium press feel.
 */
export function PressScale({
  children,
  onPress,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: Readonly<PressScaleProps>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      role="button"
      aria-label={accessibilityLabel}
      aria-disabled={disabled}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(PRESSED_SCALE, pressSpring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, pressSpring);
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
