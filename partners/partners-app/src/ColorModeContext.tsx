import type { ReactNode } from 'react';
import { DuncitThemeProvider } from '@duncit/theme';
import { PARTNERS_ACCENT } from './theme';

/**
 * The Partners App's theme + light/dark color mode now come from the shared
 * `@duncit/theme` provider (with the Partners red accent) — the running app
 * boots it via `@duncit/shell`'s `mountPortal`. This thin wrapper is kept so
 * tests / standalone renders that wrap children in `<ColorModeProvider>` keep
 * working unchanged.
 */
export { useColorMode } from '@duncit/theme';

export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DuncitThemeProvider accent={PARTNERS_ACCENT} storageKey="partners_color_mode">
      {children}
    </DuncitThemeProvider>
  );
}
