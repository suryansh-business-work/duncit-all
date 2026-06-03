import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@duncit/auth-tokens';

import { useThemeStore } from '@/stores/theme.store';

/**
 * Full-screen gradient backdrop for the auth screens. Same warm-light / deep-dark
 * gradient as mWeb, pulled from the shared @duncit/auth-tokens source.
 */
export function AuthBackground({ children }: { children: ReactNode }) {
  const isDark = useThemeStore((s) => s.scheme) === 'dark';
  const colors = isDark ? auth.bgGradient.dark : auth.bgGradient.light;

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}
