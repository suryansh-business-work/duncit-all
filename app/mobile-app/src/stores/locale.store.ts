import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { resolveLocale, type Locale } from '@duncit/i18n';

import { PublicLocalesDocument, PublicTranslationsDocument } from '@/graphql/localization';
import { graphqlRequest } from '@/services/graphql.client';
import { getItem, setItem } from '@/services/secure-storage';

type LocalesData = ResultOf<typeof PublicLocalesDocument>;
type TranslationsData = ResultOf<typeof PublicTranslationsDocument>;

const STORAGE_KEY = 'duncit_locale';

interface LocaleState {
  locales: Locale[];
  /** Flat server catalogue for the active locale. */
  catalogue: Record<string, string>;
  /** The locale actually in use, once resolved against what the platform offers. */
  locale: string;
  isRtl: boolean;
  hydrated: boolean;
  /**
   * The account language the last hydrate ran with — `null` when it ran
   * before `me` resolved. Lives here rather than in the hook so N components
   * calling useTranslation cause ONE hydrate, not N.
   */
  appliedUserLocale: string | null;
  /** Restore the saved choice, then load locales + catalogue. */
  hydrate: (userLocale?: string | null) => Promise<void>;
  /** Switch language: persists locally and reloads the catalogue. */
  setLocale: (code: string) => Promise<void>;
}

const DEFAULT_LOCALE = 'en-IN';

/**
 * The app's language. Kept in a store rather than React context so plain
 * helpers can translate too — the same reason app-formatter reads its settings
 * from a store.
 *
 * Precedence: the signed-in user's saved language, then the choice persisted on
 * this device, then the platform default. The server write is done by the
 * caller (the switcher), so this store never depends on being authenticated.
 */
export const useLocaleStore = create<LocaleState>((set, get) => {
  const loadCatalogue = async (code: string) => {
    try {
      const data: TranslationsData = await graphqlRequest(PublicTranslationsDocument, {
        locale: code,
      });
      const catalogue: Record<string, string> = {};
      for (const row of data.publicTranslations) catalogue[row.key] = row.value;
      set({ catalogue });
    } catch {
      // Offline or the API is down — the bundled fallback still renders.
      set({ catalogue: {} });
    }
  };

  return {
    locales: [],
    catalogue: {},
    locale: DEFAULT_LOCALE,
    isRtl: false,
    hydrated: false,
    appliedUserLocale: null,

    hydrate: async (userLocale) => {
      let stored: string | null = null;
      try {
        stored = await getItem(STORAGE_KEY);
      } catch {
        stored = null;
      }

      let locales: Locale[] = [];
      try {
        const data: LocalesData = await graphqlRequest(PublicLocalesDocument);
        // A REQUEST THAT SUCCEEDS can still omit the field — an older server, or
        // a partial response with errors. That never reaches the catch, so it
        // would crash the app on the very first screen that translates.
        locales = data.publicLocales ?? [];
      } catch {
        locales = [];
      }

      const active = resolveLocale(userLocale ?? stored, locales);
      const code = active?.code ?? DEFAULT_LOCALE;
      set({
        locales,
        locale: code,
        isRtl: active?.is_rtl === true,
        hydrated: true,
        appliedUserLocale: userLocale ?? null,
      });
      if (locales.length > 0) await loadCatalogue(code);
    },

    setLocale: async (code) => {
      const active = resolveLocale(code, get().locales);
      const next = active?.code ?? code;
      set({ locale: next, isRtl: active?.is_rtl === true });
      try {
        await setItem(STORAGE_KEY, next);
      } catch {
        // A failed write only costs the choice on next launch.
      }
      await loadCatalogue(next);
    },
  };
});
