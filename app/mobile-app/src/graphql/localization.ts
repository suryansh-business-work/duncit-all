import { gql } from '@/generated/graphql';

/** Active locales for the language switcher — unauthenticated, so the app can
 * render its chosen language before sign-in. */
export const PublicLocalesDocument = gql(`
  query MobilePublicLocales {
    publicLocales {
      code
      label
      english_label
      is_rtl
      is_default
      sort_order
    }
  }
`);

/** Flat catalogue for one locale, already merged over the default locale
 * server-side. The app merges it over its bundled fallback on top of that. */
export const PublicTranslationsDocument = gql(`
  query MobilePublicTranslations($locale: String!) {
    publicTranslations(locale: $locale) {
      key
      value
    }
  }
`);

/** Persist the signed-in user's language so it follows them to mWeb and the
 * portals. */
export const SetMyLocaleDocument = gql(`
  mutation MobileSetMyLocale($locale: String!) {
    setMyLocale(locale: $locale) {
      user_id
      locale
    }
  }
`);
