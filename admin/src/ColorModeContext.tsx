import type { ReactNode } from 'react';
import { DuncitThemeProvider } from '@duncit/theme';

/**
 * Admin's theme + light/dark color mode now come from the shared
 * `@duncit/theme` provider — the running app boots it via `@duncit/shell`'s
 * `mountPortal`. This thin wrapper is kept so tests / standalone renders that
 * wrap children in `<ColorModeProvider>` keep working unchanged. Admin uses the
 * default Duncit accent, so only the storage key is overridden.
 */
export { useColorMode } from '@duncit/theme';

export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <DuncitThemeProvider storageKey="admin_color_mode">{children}</DuncitThemeProvider>;
}
