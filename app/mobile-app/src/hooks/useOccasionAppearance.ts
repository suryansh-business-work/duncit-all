import { useMemo } from 'react';
import { DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';
import type { ModeColors } from '@duncit/auth-tokens';
import { occasionColorMode, occasionPalettes, type ThemePalettes } from '@duncit/utils';

import { useOccasionLook, type OccasionLook } from './useOccasionLook';

export interface OccasionAppearance {
  /** The live look, or null for the house look. */
  look: OccasionLook | null;
  /** The palettes with the look's colour overrides; the same reference when there is no look. */
  palettes: ThemePalettes<ModeColors>;
  /** The mode to paint in: the look's pinned one, else the viewer's. */
  mode: 'light' | 'dark';
  /**
   * The navigator's base ground = the app ground in that mode, so there is no
   * white flash between or behind screens (each screen paints the same ground).
   */
  navTheme: NavTheme;
}

/**
 * The app's colours and mode with the live festive look applied — what the
 * root hands Tamagui, the navigator and the status bar. Without a look the
 * palettes come back untouched (same reference), so the bundled Tamagui
 * config is kept rather than rebuilt.
 */
export function useOccasionAppearance(
  base: ThemePalettes<ModeColors>,
  scheme: 'light' | 'dark',
): OccasionAppearance {
  const look = useOccasionLook();
  const palettes = useMemo(() => occasionPalettes(base, look), [base, look]);
  const mode = occasionColorMode(scheme, look);
  const navTheme = useMemo(
    (): NavTheme => ({
      ...DefaultTheme,
      colors: { ...DefaultTheme.colors, background: palettes[mode].bg },
    }),
    [palettes, mode],
  );
  return { look, palettes, mode, navTheme };
}
