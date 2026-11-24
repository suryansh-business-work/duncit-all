import { createTranslator, type Translator } from '@duncit/i18n';

import { CRM_FALLBACK_FLAT } from '@/i18n/fallback';
import { useLocaleStore } from '@/stores/locale.store';

let shared: { locale: string; catalogue: Record<string, string>; translator: Translator } | null = null;

/** One translator per (locale, catalogue) for the whole app, so `t` keeps its identity across components. */
export function translatorFor(locale: string, isRtl: boolean, catalogue: Record<string, string>): Translator {
  if (shared?.locale === locale && shared.catalogue === catalogue) return shared.translator;
  const translator = createTranslator({ locale, isRtl, fallback: CRM_FALLBACK_FLAT, server: catalogue });
  shared = { locale, catalogue, translator };
  return translator;
}

/** Translate: server catalogue → bundled fallback → the key. */
export function useTranslation(): Translator {
  const locale = useLocaleStore((s) => s.locale);
  const isRtl = useLocaleStore((s) => s.isRtl);
  const catalogue = useLocaleStore((s) => s.catalogue);
  return translatorFor(locale, isRtl, catalogue);
}

/** The current translator outside React (background sync, the native labels file). */
export function currentTranslator(): Translator {
  const { locale, isRtl, catalogue } = useLocaleStore.getState();
  return translatorFor(locale, isRtl, catalogue);
}
