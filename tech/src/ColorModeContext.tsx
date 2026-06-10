import type { ReactNode } from 'react';
import { DuncitThemeProvider } from '@duncit/theme';
import { appConfig } from './config/app-config';

/**
 * The portal's theme + light/dark color mode now come from the shared
 * `@duncit/theme` provider — the running app boots it via `@duncit/shell`'s
 * `mountPortal`. This thin wrapper is kept so tests / standalone renders that
 * wrap children in `<ColorModeProvider>` keep working unchanged.
 */
export { useColorMode } from '@duncit/theme';

export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DuncitThemeProvider accent={appConfig.accent} storageKey={appConfig.colorModeKey}>
      {children}
    </DuncitThemeProvider>
  );
}
