import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, dark, light } from '@duncit/auth-tokens';

import { useThemeStore } from '@/stores/theme.store';

/**
 * Elevated, rounded gradient card hosting the auth form. Mirrors mWeb's auth
 * surface (gradient + border + soft shadow) using the shared card-gradient tokens.
 */
export function AuthCard({ children, testID }: { children: ReactNode; testID?: string }) {
  const isDark = useThemeStore((s) => s.scheme) === 'dark';
  const colors = isDark ? auth.cardGradient.dark : auth.cardGradient.light;

  return (
    <LinearGradient
      testID={testID}
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? dark.border : light.border,
        padding: 24,
        shadowColor: '#000000',
        shadowOpacity: isDark ? 0.4 : 0.15,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 18 },
        elevation: 12,
      }}
    >
      {children}
    </LinearGradient>
  );
}
