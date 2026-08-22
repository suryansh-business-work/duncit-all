import { gql } from '@/generated/graphql';

/**
 * Communication Preferences — the native twin of mWeb's
 * `account-page/comm-preference/queries.ts` (rule 27).
 *
 * The selection is written out in full on both documents rather than shared
 * through a fragment constant: `gql()` here is codegen's tagged template and it
 * rejects interpolation, so an interpolated selection fails the build rather
 * than saving a repetition.
 */

export const MobileCommPreferenceDocument = gql(`
  query MobileCommunicationPreference {
    myCommunicationPreference {
      updated_at
      channels {
        channel
        reachable
        destination
        otp_enabled
        otp_can_disable
      }
    }
  }
`);

export const MobileSetOtpChannelDocument = gql(`
  mutation MobileSetOtpChannel($channel: CommChannel!, $enabled: Boolean!) {
    setMyOtpChannel(channel: $channel, enabled: $enabled) {
      updated_at
      channels {
        channel
        reachable
        destination
        otp_enabled
        otp_can_disable
      }
    }
  }
`);
