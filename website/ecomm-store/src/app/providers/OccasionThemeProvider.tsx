import { useMemo, type ReactNode } from 'react';
import { GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import { FestiveLayer, OccasionContext, type OccasionValue } from '../../components/festive';
import { useBrowserState } from '../../lib/hydration';
import { storeLog } from '../../lib/log';
import { isFestiveTheme, lookFor, type FestiveTheme } from '../../theme/occasions';
import { buildStoreTheme } from '../../theme/storeTheme';
import { STORE_PALETTES, storeCssVars } from '../../theme/tokens';
import { useColorMode } from './ColorModeProvider';
import { useStoreSettings } from './StoreSettingsProvider';

/** `?occasion=DIWALI` previews a look before its dates; it lasts the browser session. */
const PREVIEW_PARAM = 'occasion';
const PREVIEW_KEY = 'ecomm_occasion_preview';
const CLEAR_PREVIEW = 'NONE';

/**
 * The previewed theme: a valid `?occasion=` (remembered for the session), else
 * the one remembered earlier. `?occasion=NONE` ends a preview. Storage can be
 * blocked; then the preview only lasts while the parameter is in the URL.
 */
function readPreview(): FestiveTheme | null {
  const param = new URLSearchParams(globalThis.location?.search ?? '').get(PREVIEW_PARAM)?.toUpperCase() ?? null;
  const fromUrl = param !== null && isFestiveTheme(param) ? param : null;
  try {
    const session = globalThis.sessionStorage;
    if (fromUrl) session?.setItem(PREVIEW_KEY, fromUrl);
    if (param === CLEAR_PREVIEW) session?.removeItem(PREVIEW_KEY);
    if (fromUrl || param === CLEAR_PREVIEW) return fromUrl;
    const saved = session?.getItem(PREVIEW_KEY) ?? '';
    return isFestiveTheme(saved) ? saved : null;
  } catch (error) {
    storeLog.warn('occasion', 'preview', { error });
    return fromUrl;
  }
}

/**
 * The live occasion's look (or a preview of one) laid over the house palette:
 * a nested MUI theme plus the `--store-*` variables every `STORE_TOKENS` colour
 * reads, so the whole store repaints. NONE renders the children untouched.
 * Also mounts the occasion's animation layer.
 */
export function OccasionThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { active_occasion: occasion } = useStoreSettings();
  const { mode, prefs, themePrefs } = useColorMode();
  // A preview lives in the URL and this tab's storage, so it is read after hydration.
  const [preview] = useBrowserState(readPreview, null);
  const theme = preview ?? occasion?.theme ?? 'NONE';
  const look = lookFor(theme);

  const palette = useMemo(() => (look ? { ...STORE_PALETTES[mode], ...look[mode] } : null), [look, mode]);
  const muiTheme = useMemo(() => (palette ? buildStoreTheme(mode, palette, themePrefs) : null), [palette, mode, themePrefs]);

  const effectsAllowed = preview !== null || occasion?.effects_enabled === true;
  const canAnimate = look !== null && effectsAllowed && !themePrefs.reduceMotion;
  const greeting = occasion && occasion.theme === theme ? occasion.greeting.trim() : '';
  const value = useMemo<OccasionValue>(
    () => ({ theme, look, greeting, canAnimate, effectsOn: canAnimate && prefs.festiveEffects }),
    [theme, look, greeting, canAnimate, prefs.festiveEffects],
  );

  const body = (
    <OccasionContext.Provider value={value}>
      {children}
      <FestiveLayer />
    </OccasionContext.Provider>
  );
  if (!palette || !muiTheme) return body;
  return (
    <ThemeProvider theme={muiTheme}>
      <GlobalStyles styles={{ ':root': storeCssVars(palette) }} />
      {body}
    </ThemeProvider>
  );
}

export { useOccasion } from '../../components/festive';
