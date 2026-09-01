import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@duncit/auth-tokens';

import { useBranding } from '@/hooks/useBranding';
import { useThemeStore } from '@/stores/theme.store';
import { BrandBackdrop } from './BrandBackdrop';

/**
 * Full-screen backdrop for the auth screens.
 *
 * The gradient is the design, not a fallback: with both admin switches off it
 * is what the screens have always drawn, and it stays underneath either way so
 * a slow or broken remote asset never leaves a blank screen. A backdrop is its
 * switch AND its asset — an admin who turns one off keeps the URL they picked,
 * so the URL alone must not draw anything. Video wins when both are on, the
 * same precedence mWeb applies (rule 27).
 */
export function AuthBackground({ children }: Readonly<{ children: ReactNode }>) {
  const isDark = useThemeStore((s) => s.scheme) === 'dark';
  const colors = isDark ? auth.bgGradient.dark : auth.bgGradient.light;
  const { data } = useBranding();
  const branding = data?.branding;

  const videoUrl = branding?.login_background_video_enabled
    ? (branding?.login_background_video_url ?? '')
    : '';
  const imageUrl = branding?.login_background_image_enabled
    ? (branding?.login_background_image_url ?? '')
    : '';

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {videoUrl || imageUrl ? <BrandBackdrop videoUrl={videoUrl} imageUrl={imageUrl} /> : null}
      {children}
    </LinearGradient>
  );
}
