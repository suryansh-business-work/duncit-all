import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { USE_NATIVE_DRIVER } from '@/animations/motion';

import { useThemeColors } from '@/hooks/useThemeColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  testID?: string;
}

/** A single pulsing placeholder block — the RN analogue of MUI's <Skeleton/>. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
  testID,
}: Readonly<SkeletonProps>) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const { muted } = useThemeColors();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      testID={testID}
      style={[{ width, height, borderRadius: radius, backgroundColor: muted, opacity }, style]}
    />
  );
}
