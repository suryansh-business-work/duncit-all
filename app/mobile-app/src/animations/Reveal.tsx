import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { durations, easeOut, ReduceMotion, staggerDelay } from '@/animations/motion';

interface RevealProps {
  children: ReactNode;
  /** Position within a staggered group — each step adds a small delay. */
  index?: number;
  /** Premium card feel: also scale up from 0.95. */
  scale?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRANSLATE_FROM = 14;
const SCALE_FROM = 0.95;

/**
 * The app-wide entry animation: fade in + rise (and optionally scale from
 * 0.95). Runs once on mount on the UI thread (Reanimated worklet), staggered
 * by `index`, and collapses to an instant appear when the OS reduced-motion
 * setting is on. Wrap sections, cards, list items and empty states in this so
 * nothing pops in abruptly.
 */
export function Reveal({
  children,
  index = 0,
  scale = false,
  style,
  testID,
}: Readonly<RevealProps>) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      staggerDelay(index),
      withTiming(1, {
        duration: durations.base,
        easing: easeOut,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [progress, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * TRANSLATE_FROM },
      { scale: scale ? SCALE_FROM + progress.value * (1 - SCALE_FROM) : 1 },
    ],
  }));

  return (
    <Animated.View testID={testID} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
