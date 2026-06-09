import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme } from './theme';
import { appConfig } from './config/app-config';

interface ColorModeContextValue {
  mode: PaletteMode;
  toggle: () => void;
  set: (mode: PaletteMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => undefined,
  set: () => undefined,
});

const STORAGE_KEY = appConfig.colorModeKey;

export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem(STORAGE_KEY, next);
          return next;
        }),
      set: (m) => {
        localStorage.setItem(STORAGE_KEY, m);
        setMode(m);
      },
    }),
    [mode]
  );

  const theme = useMemo(() => buildTheme(mode, appConfig.accent), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
