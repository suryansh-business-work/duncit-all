import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Font from 'expo-font';

import { useBranding } from '@/hooks/useBranding';

const fontCssUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${family.trim().replaceAll(' ', '+')}&display=swap`;

/** First downloadable font file in a Google Fonts stylesheet (RN's default
 * fetch UA gets ttf/otf URLs rather than woff2). */
export const extractFontUrl = (css: string): string | null =>
  /url\((https:[^)]+\.(?:ttf|otf))\)/.exec(css)?.[1] ?? null;

/**
 * Loads the admin-picked Google Font (Branding → Fonts → Mobile App) at boot
 * and returns its family name once usable — App.tsx then rebuilds the Tamagui
 * config around it. Web injects the stylesheet (the browser rasterises it);
 * native downloads the font file via expo-font. Empty setting → undefined
 * (the built-in brand family stays).
 */
export function useBrandFont(): string | undefined {
  const { data } = useBranding();
  const family = data?.branding?.mobile_font_family?.trim() ?? '';
  const [loadedFamily, setLoadedFamily] = useState<string>();

  useEffect(() => {
    if (!family) {
      setLoadedFamily(undefined);
      return undefined;
    }
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontCssUrl(family);
      document.head.appendChild(link);
      setLoadedFamily(family);
      return () => link.remove();
    }
    let active = true;
    (async () => {
      try {
        const css = await (await fetch(fontCssUrl(family))).text();
        const fontUrl = extractFontUrl(css);
        if (!fontUrl) return;
        await Font.loadAsync({ [family]: fontUrl });
        if (active) setLoadedFamily(family);
      } catch {
        // Best-effort: an unreachable font keeps the default typeface.
      }
    })();
    return () => {
      active = false;
    };
  }, [family]);

  return loadedFamily;
}
