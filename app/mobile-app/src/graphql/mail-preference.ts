import { gql } from '@/generated/graphql';

/**
 * Mail Preference — the native twin of mWeb's `mail-preference-page/queries.ts`
 * (rule 27). The app only ever reads the SIGNED-IN half: an unsubscribe link
 * from an email opens in a browser, which is mWeb's `/unsubscribe`.
 */

export const MobileMailPreferencesDocument = gql(`
  query MobileMailPreferences {
    myMailPreferences {
      email
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);

export const MobileSetMailPreferenceDocument = gql(`
  mutation MobileSetMailPreference($category: String!, $enabled: Boolean!) {
    setMyMailPreference(category: $category, enabled: $enabled) {
      email
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);

export const MobileSetAllMailPreferencesDocument = gql(`
  mutation MobileSetAllMailPreferences($enabled: Boolean!) {
    setAllMyMailPreferences(enabled: $enabled) {
      email
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);
