import { create } from 'zustand';
import { logs } from '@duncit/logs';

import { CrmAppLocalesDocument, CrmAppTranslationsDocument } from '@/graphql/localization';
import { gqlRequest } from '@/services/graphql.client';

interface LocaleState {
  locale: string;
  isRtl: boolean;
  /** The server's catalogue for `locale`; empty until it answers (the bundled copy shows meanwhile). */
  catalogue: Record<string, string>;
  /** Load the account's language (or the platform default) and its catalogue. */
  load: (preferred?: string | null) => Promise<void>;
}

const FALLBACK_LOCALE = 'en-IN';

/**
 * Server-first localisation (rule 24): the catalogue the server holds for the
 * reader's language, over the bundled fallback. A failed load keeps the
 * bundled copy on screen and is logged — never a blank or a key.
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: FALLBACK_LOCALE,
  isRtl: false,
  catalogue: {},
  load: async (preferred) => {
    try {
      const { publicLocales } = await gqlRequest(CrmAppLocalesDocument, undefined, { auth: false });
      const chosen =
        publicLocales.find((l) => l.code === preferred) ??
        publicLocales.find((l) => l.is_default) ??
        publicLocales[0];
      const locale = chosen?.code ?? FALLBACK_LOCALE;
      const { publicTranslations } = await gqlRequest(
        CrmAppTranslationsDocument,
        { locale },
        { auth: false },
      );
      const catalogue: Record<string, string> = {};
      for (const row of publicTranslations) catalogue[row.key] = row.value;
      set({ locale, isRtl: chosen?.is_rtl ?? false, catalogue });
    } catch (error) {
      logs.mobileApp.warn('crm-app', 'locale-load', {
        error,
        msg: 'Server translations unavailable; bundled copy in use',
      });
    }
  },
}));
