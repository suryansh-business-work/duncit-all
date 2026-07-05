import type { ReactNode } from 'react';
import { DuncitThemeProvider, type AccentColors } from '@duncit/theme';

export interface ColorModeProviderProps {
  /** Portal brand accent; falls back to the Duncit default. */
  accent?: AccentColors;
  /** localStorage key for persisting the chosen mode. */
  storageKey?: string;
  children: ReactNode;
}

/**
 * Lightweight theme + color-mode provider for tests / standalone renders —
 * replaces the per-portal ColorModeContext shims. The running app gets the
 * same providers from `mountPortal`.
 */
export function ColorModeProvider({ accent, storageKey, children }: Readonly<ColorModeProviderProps>) {
  return (
    <DuncitThemeProvider accent={accent} storageKey={storageKey}>
      {children}
    </DuncitThemeProvider>
  );
}
