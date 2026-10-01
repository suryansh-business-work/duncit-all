import { gql } from '@apollo/client';

/** Active locales for the language switcher. Unauthenticated: login screens
 * and the marketing sites need it before there is a session. */
export const PUBLIC_LOCALES = gql`
  query PublicLocales {
    publicLocales {
      code
      label
      english_label
      is_rtl
      is_default
      sort_order
    }
  }
`;

/** Flat catalogue for one locale, already merged over the default locale. */
export const PUBLIC_TRANSLATIONS = gql`
  query PublicTranslations($locale: String!) {
    publicTranslations(locale: $locale) {
      key
      value
    }
  }
`;
