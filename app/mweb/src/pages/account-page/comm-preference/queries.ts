import { gql } from '@apollo/client';

/** The three channels, in the order the section renders them. */
export type CommChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export interface CommChannelPreference {
  channel: CommChannel;
  /** False when there is no address/number for this channel on the account. */
  reachable: boolean;
  destination: string;
  otp_enabled: boolean;
  /** False when this is the last channel that could still carry a code. */
  otp_can_disable: boolean;
}

export interface CommPreference {
  channels: CommChannelPreference[];
  updated_at: string | null;
}

/**
 * The selection both documents return.
 *
 * A balanced fragment — it opens and closes its own braces, so interpolating
 * it can never leave a document one brace short. (A shared selection carrying a
 * trailing `}` belonging to its caller once took every page that imported it
 * down at module load.)
 */
const FIELDS = `
  updated_at
  channels {
    channel
    reachable
    destination
    otp_enabled
    otp_can_disable
  }
`;

export const MY_COMM_PREFERENCE = gql`
  query MyCommunicationPreference {
    myCommunicationPreference { ${FIELDS} }
  }
`;

export const SET_MY_OTP_CHANNEL = gql`
  mutation SetMyOtpChannel($channel: CommChannel!, $enabled: Boolean!) {
    setMyOtpChannel(channel: $channel, enabled: $enabled) { ${FIELDS} }
  }
`;
