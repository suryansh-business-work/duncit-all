import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Behind the featured Quick Access tile (Earn with Duncit): the brand
 * gradient, with a soft band of light sweeping across it now and then. The
 * sweep holds still under Reduce Motion (WCAG 2.2.2). mWeb twin: the tile's
 * ANIMATED_BRAND_GRADIENT_SX.
 */
export function FeaturedTileBackdrop() {
  const { brand, primary, onPrimary } = useThemeColors();
  const reduceMotion = useReduceMotion();
  const sweep = useSharedValue(-1);
  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withRepeat(withTiming(2, { duration: 2800, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduceMotion, sweep]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: sweep.value * 60 }, { rotate: '20deg' }] }));

  return (
    <>
      <LinearGradient colors={[brand, primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {reduceMotion ? null : (
        <Animated.View pointerEvents="none" style={[styles.band, { backgroundColor: onPrimary }, band]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: -20, bottom: -20, left: 0, width: 18, opacity: 0.18 },
});
