import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, resolveLocale, type FlatCatalogue, type Locale } from '@duncit/i18n';
import { fetchLocales, fetchTranslations } from '../api';
import { STATUS_FALLBACK } from './bundle';

interface LocaleState {
  locale: Locale | null;
  server: FlatCatalogue | null;
}

const TranslationContext = createContext<LocaleState>({ locale: null, server: null });

/**
 * Localization for the status page.
 *
 * The site carries no Apollo client and no session, so it cannot use the
 * portals' `LocaleProvider` — but it uses the SAME runtime and the same admin
 * data underneath (rule 38): the active locales and their catalogue come from
 * the public localization queries, layered over the bundled fallback. Both
 * fetches are best-effort; the fallback is what renders when either is absent,
 * which is the whole reason a status page ships one.
 */
export function TranslationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<LocaleState>({ locale: null, server: null });

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      const locales = await fetchLocales(ctrl.signal);
      const active = resolveLocale(globalThis.navigator?.language, locales);
      if (!active) return;
      setState({ locale: active, server: null });
      const server = await fetchTranslations(active.code, ctrl.signal);
      setState({ locale: active, server });
    };
    load().catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  const value = useMemo(() => state, [state]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/** Translate a key. Works outside the provider too, on the bundled fallback. */
export function useTranslation() {
  const { locale, server } = useContext(TranslationContext);
  return useMemo(
    () =>
      createTranslator({
        locale: locale?.code ?? 'en-IN',
        isRtl: locale?.is_rtl === true,
        fallback: STATUS_FALLBACK,
        server,
      }),
    [locale, server],
  );
}
