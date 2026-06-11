import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useThemeStore } from '@/stores/theme.store';

/**
 * App-wide gradient backdrop — RN port of mWeb's `theme.ts` body background: a
 * vertical base gradient with a pink (top-left) and violet (top-right) radial
 * glow. Rendered once behind the navigator; signed-in screens are transparent so
 * this shows through. Surfaces (`$surface`) stay opaque on top, like mWeb.
 */
export function AppBackground() {
  const scheme = useThemeStore((s) => s.scheme);
  const dark = scheme === 'dark';

  const base = dark ? (['#100d18', '#08070b'] as const) : (['#fff5f7', '#ffffff'] as const);
  const pinkOpacity = dark ? 0.2 : 0.15;
  const violetOpacity = dark ? 0.18 : 0.1;

  return (
    <>
      <LinearGradient
        testID="app-background"
        colors={base}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow-pink" cx="8%" cy="0%" r="45%">
            <Stop offset="0" stopColor="#ff4f73" stopOpacity={pinkOpacity} />
            <Stop offset="1" stopColor="#ff4f73" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-violet" cx="92%" cy="14%" r="42%">
            <Stop offset="0" stopColor="#8b5cf6" stopOpacity={violetOpacity} />
            <Stop offset="1" stopColor="#8b5cf6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow-pink)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow-violet)" />
      </Svg>
    </>
  );
}
