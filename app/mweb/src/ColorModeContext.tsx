import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { logs } from '@duncit/logs';
import { OccasionLayer } from '@duncit/ui';
import { occasionColorMode, occasionPalettes } from '@duncit/utils';
import { buildTheme } from './theme';
import { useThemeTokens } from './hooks/useThemeTokens';
import { useOccasionLive } from './hooks/useOccasionLive';

interface ColorModeContextValue {
  /** The mode on screen — the viewer's choice, unless a festive look pins one. */
  mode: PaletteMode;
  /** A festive look pins the mode right now (Halloween is a night): the toggles have nothing to change. */
  locked: boolean;
  toggle: () => void;
  set: (mode: PaletteMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  locked: false,
  toggle: () => undefined,
  set: () => undefined,
});

const STORAGE_KEY = 'mweb_color_mode';

/** Clears mWeb's bottom navigation, so the celebration's pause button never sits on a tab. */
const PAUSE_ABOVE_NAV_PX = 88;

const logOccasionError = (error: unknown, where: string) => logs.mWeb.warn('occasion', where, { error });

export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (globalThis.window === undefined) return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const occasion = useOccasionLive();
  const shown = occasionColorMode(mode, occasion);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode: shown,
      locked: occasion?.color_mode === 'LIGHT' || occasion?.color_mode === 'DARK',
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
    [shown, occasion]
  );

  // Branding → Theme tokens first, then the festive look's own tokens over them.
  const tokens = useThemeTokens();
  const palettes = useMemo(() => occasionPalettes(tokens, occasion), [tokens, occasion]);
  const theme = useMemo(() => buildTheme(shown, palettes[shown]), [shown, palettes]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        {occasion ? <OccasionLayer design={occasion} bottomOffset={PAUSE_ABOVE_NAV_PX} onError={logOccasionError} /> : null}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
