import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { DuncitLogo } from '@/components/DuncitLogo';

const SPLASH_MS = 1600;
const FADE_MS = 350;

/**
 * Branded boot splash — the Duncit logo over the brand red, shown for a beat on
 * every cold start then faded out (mWeb-parity; the native expo-splash-screen
 * only covers the binary launch, not the JS boot).
 */
export function SplashOverlay({ onDone }: Readonly<{ onDone?: () => void }>) {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
        () => {
          setVisible(false);
          onDone?.();
        },
      );
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [opacity, onDone]);

  if (!visible) return null;

  return (
    <Animated.View testID="splash-overlay" style={[styles.fill, { opacity }]} pointerEvents="none">
      <DuncitLogo size={96} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F82C2E',
  },
});
