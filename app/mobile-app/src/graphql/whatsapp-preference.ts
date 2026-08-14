import { gql } from '@/generated/graphql';

/**
 * WhatsApp Preference — the native twin of mWeb's
 * `whatsapp-preference-page/queries.ts` (rule 27). Only the SIGNED-IN half
 * exists: WhatsApp has no unsubscribe link to land on, a person stops a
 * category from here or by replying STOP to Meta.
 */

export const MobileWhatsappPreferenceDocument = gql(`
  query MobileWhatsappPreference {
    myWhatsappPreference {
      destination
      reachable
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);

export const MobileSetWhatsappPreferenceDocument = gql(`
  mutation MobileSetWhatsappPreference($category: String!, $enabled: Boolean!) {
    setMyWhatsappPreference(category: $category, enabled: $enabled) {
      destination
      reachable
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);

export const MobileSetAllWhatsappPreferencesDocument = gql(`
  mutation MobileSetAllWhatsappPreferences($enabled: Boolean!) {
    setAllMyWhatsappPreferences(enabled: $enabled) {
      destination
      reachable
      updated_at
      categories {
        category
        required
        enabled
      }
    }
  }
`);
