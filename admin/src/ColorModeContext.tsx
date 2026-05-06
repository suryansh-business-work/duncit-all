import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme } from './theme';

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

const STORAGE_KEY = 'admin_color_mode';

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'dark' ? 'dark' : 'light';
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

  const theme = useMemo(() => buildTheme(mode), [mode]);

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
