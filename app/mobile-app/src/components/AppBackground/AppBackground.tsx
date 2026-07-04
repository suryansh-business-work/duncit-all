import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeStore } from '@/stores/theme.store';

const DARK = ['#100d18', '#08070b'] as const;
const LIGHT = ['#fff5f7', '#ffffff'] as const;

/**
 * App-wide gradient backdrop — a single vertical LinearGradient (GPU-composited,
 * cheap). The former full-screen SVG radial glows were removed: rasterising two
 * react-native-svg radial gradients on every screen — and re-rasterising them
 * frame-by-frame while native screen transitions animate the backdrop — janked
 * every non-home screen on Android. Surfaces (`$surface`) stay opaque on top.
 */
export function AppBackground() {
  const scheme = useThemeStore((s) => s.scheme);
  const colors = scheme === 'dark' ? DARK : LIGHT;

  return (
    <LinearGradient
      testID="app-background"
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
