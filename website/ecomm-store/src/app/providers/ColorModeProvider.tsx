import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';

import { storeLog } from '../../lib/log';
import { buildStoreTheme } from '../../theme/storeTheme';
import type { StoreColorMode } from '../../theme/tokens';

interface ColorModeValue {
  mode: StoreColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeValue>({ mode: 'light', toggle: () => undefined });

const STORAGE_KEY = 'ecomm_color_mode';

/** The shopper's saved choice, else the device's preference. */
function initialMode(): StoreColorMode {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (error) {
    storeLog.warn('colorMode', 'read', { error });
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Persisting is a convenience: a blocked storage only means the choice lasts this visit. */
function saveMode(mode: StoreColorMode): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  } catch (error) {
    storeLog.warn('colorMode', 'save', { error });
  }
}

/** The store theme in the shopper's light/dark mode, with `useColorMode` to switch it. */
export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [mode, setMode] = useState<StoreColorMode>(initialMode);
  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      saveMode(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);
  const theme = useMemo(() => buildStoreTheme(mode), [mode]);
  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
