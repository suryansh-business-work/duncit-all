import { useEffect } from 'react';
import { createTranslator, type Translator } from '@duncit/i18n';

import { NATIVE_FALLBACK_FLAT } from '@/i18n/fallback';
import { useLocaleStore } from '@/stores/locale.store';

/**
 * Translate in the native app — the RN twin of mWeb's useTranslation, built on
 * the same @duncit/i18n core so both surfaces resolve text identically.
 *
 * Text precedence: server catalogue -> the app's bundled fallback -> the key.
 * So a screen shows real copy offline and before the API answers.
 */
export function useTranslation(): Translator & { setLocale: (code: string) => Promise<void> } {
  const locale = useLocaleStore((s) => s.locale);
  const isRtl = useLocaleStore((s) => s.isRtl);
  const catalogue = useLocaleStore((s) => s.catalogue);
  const hydrated = useLocaleStore((s) => s.hydrated);
  const hydrate = useLocaleStore((s) => s.hydrate);
  const setLocale = useLocaleStore((s) => s.setLocale);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const translator = createTranslator({
    locale,
    isRtl,
    fallback: NATIVE_FALLBACK_FLAT,
    server: catalogue,
  });

  return { ...translator, setLocale };
}
