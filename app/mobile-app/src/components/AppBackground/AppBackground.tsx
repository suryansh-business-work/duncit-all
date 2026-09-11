import { StyleSheet, View } from 'react-native';
import { dark, light } from '@duncit/auth-tokens';

import { useThemeStore } from '@/stores/theme.store';

// Exported so root-level overlays (e.g. ForceUpdateGate) and the navigator's
// base colour paint exactly the ground this component paints.
export const APP_BG = { light: light.bg, dark: dark.bg } as const;

/**
 * App-wide backdrop — the flat warm off-white (or near-black) ground every
 * screen sits on. Cards read by contrast against it, the same flat page mWeb
 * paints from the same token. Surfaces (`$surface`) stay opaque on top.
 */
export function AppBackground() {
  const scheme = useThemeStore((s) => s.scheme);

  return (
    <View
      testID="app-background"
      style={[StyleSheet.absoluteFill, { backgroundColor: APP_BG[scheme] }]}
    />
  );
}
