import { StyleSheet, View } from 'react-native';
import { dark, light } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';

// Exported so root-level overlays (e.g. ForceUpdateGate) and the navigator's
// base colour paint exactly the ground this component paints.
export const APP_BG = { light: light.bg, dark: dark.bg } as const;

/**
 * App-wide backdrop — the flat warm off-white (or near-black) ground every
 * screen sits on. Cards read by contrast against it, the same flat page mWeb
 * paints from the same token. Surfaces (`$surface`) stay opaque on top.
 */
export function AppBackground() {
  // The theme's `background`, so an admin's Branding → Theme tokens `bg`
  // repaints the ground; with the source on Local it is the bundled value.
  const { background } = useThemeColors();

  return (
    <View
      testID="app-background"
      style={[StyleSheet.absoluteFill, { backgroundColor: background }]}
    />
  );
}
