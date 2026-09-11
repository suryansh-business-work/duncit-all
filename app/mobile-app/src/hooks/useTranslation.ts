import { useEffect, useMemo } from 'react';
import { createTranslator, type Translator } from '@duncit/i18n';

import { NATIVE_FALLBACK_FLAT } from '@/i18n/fallback';
import { useLocaleStore } from '@/stores/locale.store';
import { useMeStore } from '@/stores/me.store';

interface SharedTranslator {
  locale: string;
  isRtl: boolean;
  catalogue: Record<string, string>;
  translator: Translator;
}

let shared: SharedTranslator | null = null;

/**
 * The translator for the store's current locale + catalogue, shared by every
 * component. createTranslator copies the whole bundled fallback (~3.7k keys)
 * plus the server catalogue; a per-component useMemo still did that once per
 * MOUNTED component, and again for all of them when the catalogue landed —
 * hundreds of copies on the first screen. Every caller reads the same store
 * values, so one build per distinct (locale, isRtl, catalogue) serves them all.
 */
function sharedTranslator(
  locale: string,
  isRtl: boolean,
  catalogue: Record<string, string>,
): Translator {
  if (shared?.locale === locale && shared.isRtl === isRtl && shared.catalogue === catalogue) {
    return shared.translator;
  }
  const translator = createTranslator({
    locale,
    isRtl,
    fallback: NATIVE_FALLBACK_FLAT,
    server: catalogue,
  });
  shared = { locale, isRtl, catalogue, translator };
  return translator;
}

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
  // The signed-in account's saved language, so the choice follows the user to a
  // new device instead of only persisting in this install's secure storage.
  const userLocale = useMeStore((s) => s.data?.me?.locale) ?? null;

  const applied = useLocaleStore((s) => s.appliedUserLocale);

  useEffect(() => {
    // `me` resolves AFTER the first render, so a hydrate-once guard would
    // always miss the account language. Keying on the value instead re-applies
    // it exactly once per distinct locale — and because the marker lives in the
    // store, N components using this hook still cause one hydrate, not N.
    if (hydrated && applied === userLocale) return;
    hydrate(userLocale);
  }, [hydrated, hydrate, userLocale, applied]);

  // One translator for the whole app per locale/catalogue (see sharedTranslator),
  // so `t` also keeps one identity across renders and components — a new one
  // re-ran every effect and memo that lists `t` as a dependency.
  const translator = sharedTranslator(locale, isRtl, catalogue);

  return useMemo(() => ({ ...translator, setLocale }), [translator, setLocale]);
}
