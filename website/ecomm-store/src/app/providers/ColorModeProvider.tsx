import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';

import { DEFAULT_PREFERENCES, readPreferences, savePreferences, type StorePreferences } from '../../lib/preferences';
import { buildStoreTheme, type StoreThemePrefs } from '../../theme/storeTheme';
import { STORE_PALETTES, type StoreColorMode } from '../../theme/tokens';

interface ColorModeValue {
  /** The mode actually painted (a `system` choice resolved against the device). */
  mode: StoreColorMode;
  toggle: () => void;
  prefs: StorePreferences;
  /** Change some choices; the rest stay. Saved for this browser. */
  setPrefs: (patch: Partial<StorePreferences>) => void;
  /** The parts of the choices the theme is built from — an occasion theme reuses them. */
  themePrefs: StoreThemePrefs;
}

const ColorModeContext = createContext<ColorModeValue>({
  mode: 'light',
  toggle: () => undefined,
  prefs: DEFAULT_PREFERENCES,
  setPrefs: () => undefined,
  themePrefs: { textScale: 1, underlineLinks: false, reduceMotion: false, readableFont: false },
});

/**
 * The store theme in the shopper's light/dark mode and accessibility choices,
 * with `useColorMode` to change them. An operating-system "reduce motion"
 * counts as the shopper asking for it.
 */
export function ColorModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [prefs, setPrefsState] = useState<StorePreferences>(readPreferences);
  const deviceDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const deviceStill = useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });
  const deviceMode: StoreColorMode = deviceDark ? 'dark' : 'light';
  const mode: StoreColorMode = prefs.color === 'system' ? deviceMode : prefs.color;

  const setPrefs = useCallback((patch: Partial<StorePreferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);
  const toggle = useCallback(() => setPrefs({ color: mode === 'light' ? 'dark' : 'light' }), [mode, setPrefs]);

  const themePrefs = useMemo<StoreThemePrefs>(
    () => ({
      textScale: prefs.textScale,
      underlineLinks: prefs.underlineLinks,
      reduceMotion: prefs.reduceMotion || deviceStill,
      readableFont: prefs.readableFont,
    }),
    [prefs.textScale, prefs.underlineLinks, prefs.reduceMotion, prefs.readableFont, deviceStill],
  );
  const value = useMemo(() => ({ mode, toggle, prefs, setPrefs, themePrefs }), [mode, toggle, prefs, setPrefs, themePrefs]);
  const theme = useMemo(() => buildStoreTheme(mode, STORE_PALETTES[mode], themePrefs), [mode, themePrefs]);
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
