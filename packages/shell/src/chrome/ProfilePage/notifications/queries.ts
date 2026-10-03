import { gql } from '@apollo/client';

/** One kind of message and whether this person still wants it. */
export interface PreferenceCategory {
  category: string;
  /** Codes, receipts, account notices — shown, but locked on. */
  required: boolean;
  enabled: boolean;
}

export interface MailPreference {
  email: string;
  categories: PreferenceCategory[];
}

export interface WhatsAppPreference {
  destination: string;
  /** False when there is no sendable number, so nothing can be delivered yet. */
  reachable: boolean;
  categories: PreferenceCategory[];
}

// Balanced selection fragments — each opens and closes its own braces, so
// interpolating one can never leave a document a brace short.
const MAIL_FIELDS = `
  email
  categories {
    category
    required
    enabled
  }
`;

const WHATSAPP_FIELDS = `
  destination
  reachable
  categories {
    category
    required
    enabled
  }
`;

const COMM_FIELDS = `
  channels {
    channel
    reachable
    destination
    otp_enabled
    otp_can_disable
  }
`;

export const MY_MAIL_PREFERENCES = gql`
  query ShellMyMailPreferences {
    myMailPreferences { ${MAIL_FIELDS} }
  }
`;

export const SET_MY_MAIL_PREFERENCE = gql`
  mutation ShellSetMyMailPreference($category: String!, $enabled: Boolean!) {
    setMyMailPreference(category: $category, enabled: $enabled) { ${MAIL_FIELDS} }
  }
`;

export const MY_WHATSAPP_PREFERENCE = gql`
  query ShellMyWhatsappPreference {
    myWhatsappPreference { ${WHATSAPP_FIELDS} }
  }
`;

export const SET_MY_WHATSAPP_PREFERENCE = gql`
  mutation ShellSetMyWhatsappPreference($category: String!, $enabled: Boolean!) {
    setMyWhatsappPreference(category: $category, enabled: $enabled) { ${WHATSAPP_FIELDS} }
  }
`;

export const MY_COMM_PREFERENCE = gql`
  query ShellMyCommunicationPreference {
    myCommunicationPreference { ${COMM_FIELDS} }
  }
`;

export const SET_MY_OTP_CHANNEL = gql`
  mutation ShellSetMyOtpChannel($channel: CommChannel!, $enabled: Boolean!) {
    setMyOtpChannel(channel: $channel, enabled: $enabled) { ${COMM_FIELDS} }
  }
`;
