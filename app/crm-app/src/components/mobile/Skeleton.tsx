import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';

import { MOBILE, RADII } from '@/constants/design';
import { SURFACE } from '@/components/surface';

const DIM = 0.45;

/**
 * Pulses its children between full and dim opacity while content loads; holds
 * still when the person asked the system to reduce motion.
 */
function Pulse({ children }: Readonly<{ children: ReactNode }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const half = MOBILE.pulse / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: DIM,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    let stopped = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!reduce && !stopped) loop.start();
      })
      .catch((error: unknown) =>
        logs.mobileApp.warn('crm-app/Skeleton', 'reduceMotion', { error }),
      );
    return () => {
      stopped = true;
      loop.stop();
    };
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/** One grey placeholder bar. */
export function SkeletonBlock({
  width = '100%',
  height = 12,
  round = false,
}: Readonly<{ width?: number | `${number}%`; height?: number; round?: boolean }>) {
  return (
    <YStack
      width={width}
      height={height}
      borderRadius={round ? height / 2 : RADII.sm}
      backgroundColor="$soft"
    />
  );
}

/**
 * The shape of a list while it loads: a few rows, each an avatar and two lines,
 * so the screen keeps its layout instead of jumping when the data arrives.
 */
export function SkeletonRows({
  rows = 5,
  testID = 'skeleton',
}: Readonly<{ rows?: number; testID?: string }>) {
  return (
    <YStack gap="$2" aria-busy testID={testID}>
      <Pulse>
        <YStack gap="$2">
          {Array.from({ length: rows }, (_, i) => (
            <XStack key={i} {...SURFACE} gap="$3" alignItems="center">
              <SkeletonBlock width={MOBILE.avatar} height={MOBILE.avatar} round />
              <YStack flex={1} gap="$2">
                <SkeletonBlock width="60%" height={14} />
                <SkeletonBlock width="85%" height={10} />
              </YStack>
            </XStack>
          ))}
        </YStack>
      </Pulse>
    </YStack>
  );
}
