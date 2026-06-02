import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createDuncitTheme } from './createDuncitTheme';
import { tokens } from './tokens';
import type { AccentColors, ColorMode } from './types';

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
  set: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => undefined,
  set: () => undefined,
});

interface Props {
  /** Portal brand accent; falls back to the Duncit default. */
  accent?: AccentColors;
  /** localStorage key for persisting the chosen mode. */
  storageKey?: string;
  /** Mode used on first load when nothing is stored. */
  defaultMode?: ColorMode;
  children: ReactNode;
}

const readStored = (key: string, fallback: ColorMode): ColorMode => {
  /* v8 ignore next -- SSR guard, unreachable in the browser */
  if (typeof window === 'undefined') return fallback;
  const saved = localStorage.getItem(key);
  return saved === 'dark' || saved === 'light' ? saved : fallback;
};

/**
 * Drop-in theme provider for every Duncit console: builds the shared theme,
 * applies CssBaseline and exposes a persisted light/dark color mode via
 * `useColorMode`. Pass the portal's brand `accent` and a unique `storageKey`.
 */
export function DuncitThemeProvider({ accent = tokens.defaultAccent, storageKey = 'duncit_color_mode', defaultMode = 'dark', children }: Props) {
  const [mode, setMode] = useState<ColorMode>(() => readStored(storageKey, defaultMode));

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem(storageKey, next);
          return next;
        }),
      set: (next) => {
        localStorage.setItem(storageKey, next);
        setMode(next);
      },
    }),
    [mode, storageKey]
  );

  const theme = useMemo(() => createDuncitTheme(mode, accent), [mode, accent]);

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
