import { gql } from '@apollo/client';

/** One kind of WhatsApp message and whether this person still wants it. */
export interface WhatsAppPreferenceCategory {
  category: string;
  /** Tickets, money and account changes — shown, but locked on. */
  required: boolean;
  enabled: boolean;
}

export interface WhatsAppPreference {
  /** The number these messages go to, already formatted by the server. */
  destination: string;
  /** False when there is no sendable number, so nothing can be delivered yet. */
  reachable: boolean;
  categories: WhatsAppPreferenceCategory[];
  updated_at: string | null;
}

/**
 * The selection all three of these documents return.
 *
 * A balanced fragment of a selection set — it opens and closes its own braces,
 * so interpolating it can never leave a document one brace short. (An earlier
 * shared selection in this codebase carried a trailing `}` belonging to its
 * caller and took every page that imported it down at module load.)
 */
const FIELDS = `
  destination
  reachable
  updated_at
  categories {
    category
    required
    enabled
  }
`;

export const MY_WHATSAPP_PREFERENCE = gql`
  query MyWhatsappPreference {
    myWhatsappPreference { ${FIELDS} }
  }
`;

export const SET_MY_WHATSAPP_PREFERENCE = gql`
  mutation SetMyWhatsappPreference($category: String!, $enabled: Boolean!) {
    setMyWhatsappPreference(category: $category, enabled: $enabled) { ${FIELDS} }
  }
`;

export const SET_ALL_MY_WHATSAPP_PREFERENCES = gql`
  mutation SetAllMyWhatsappPreferences($enabled: Boolean!) {
    setAllMyWhatsappPreferences(enabled: $enabled) { ${FIELDS} }
  }
`;
