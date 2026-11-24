import { gql } from '@/generated/graphql';

/** The active locales; the default one is used until the account names its own. */
export const CrmAppLocalesDocument = gql(`
  query CrmAppLocales {
    publicLocales {
      code
      is_rtl
      is_default
    }
  }
`);

/** One locale's catalogue, already merged over the default locale server-side. */
export const CrmAppTranslationsDocument = gql(`
  query CrmAppTranslations($locale: String!) {
    publicTranslations(locale: $locale) {
      key
      value
    }
  }
`);
