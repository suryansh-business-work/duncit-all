import { CLUB_ADMIN_BUNDLE, MWEB_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/i18n';

/** The bundle's own English for `mweb.venuePods.*`, resolved the way mWeb and native do. */
export const { t: mwebT } = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(MWEB_BUNDLE) });

/** The bundle's own English for `clubAdmin.*`, resolved the way every surface does. */
export const { t: clubAdminT } = createTranslator({
  locale: 'en-IN',
  fallback: flattenCatalogue(CLUB_ADMIN_BUNDLE),
});
