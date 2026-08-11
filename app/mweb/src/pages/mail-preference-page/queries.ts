import { gql } from '@apollo/client';

/** One kind of email and whether this person still wants it. */
export interface MailPreferenceCategory {
  category: string;
  /** Codes, receipts and legal notices — shown, but locked on. */
  required: boolean;
  enabled: boolean;
}

export interface MailPreference {
  email: string;
  categories: MailPreferenceCategory[];
  updated_at: string | null;
}

/**
 * The selection every one of these six documents returns.
 *
 * A balanced fragment of a selection set — it opens and closes its own braces,
 * so interpolating it can never leave a document one brace short. (An earlier
 * shared selection in this codebase carried a trailing `}` belonging to its
 * caller and took every page that imported it down at module load.)
 */
const FIELDS = `
  email
  updated_at
  categories {
    category
    required
    enabled
  }
`;

export const MY_MAIL_PREFERENCES = gql`
  query MyMailPreferences {
    myMailPreferences { ${FIELDS} }
  }
`;

export const SET_MY_MAIL_PREFERENCE = gql`
  mutation SetMyMailPreference($category: String!, $enabled: Boolean!) {
    setMyMailPreference(category: $category, enabled: $enabled) { ${FIELDS} }
  }
`;

export const SET_ALL_MY_MAIL_PREFERENCES = gql`
  mutation SetAllMyMailPreferences($enabled: Boolean!) {
    setAllMyMailPreferences(enabled: $enabled) { ${FIELDS} }
  }
`;

/** The unauthenticated trio, for somebody arriving from a link in an email. */
export const MAIL_PREFERENCES_BY_TOKEN = gql`
  query MailPreferencesByToken($e: String!, $t: String!) {
    mailPreferencesByToken(e: $e, t: $t) { ${FIELDS} }
  }
`;

export const SET_MAIL_PREFERENCE_BY_TOKEN = gql`
  mutation SetMailPreferenceByToken(
    $e: String!
    $t: String!
    $category: String!
    $enabled: Boolean!
  ) {
    setMailPreferenceByToken(e: $e, t: $t, category: $category, enabled: $enabled) { ${FIELDS} }
  }
`;

export const UNSUBSCRIBE_ALL_BY_TOKEN = gql`
  mutation UnsubscribeAllByToken($e: String!, $t: String!) {
    unsubscribeAllByToken(e: $e, t: $t) { ${FIELDS} }
  }
`;
