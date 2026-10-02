import { gql } from '@/generated/graphql';

/**
 * Tracking consent and the data export — the native twin of mWeb's
 * `components/consent/queries.ts` (rule 27).
 */

export const MyTrackingConsentDocument = gql(`
  query MobileMyTrackingConsent {
    myTrackingConsent {
      analytics
      marketing
      decided_at
    }
  }
`);

export const SetMyTrackingConsentDocument = gql(`
  mutation MobileSetMyTrackingConsent($input: TrackingConsentInput!) {
    setMyTrackingConsent(input: $input) {
      analytics
      marketing
      decided_at
    }
  }
`);

export const MyDataExportDocument = gql(`
  query MobileMyDataExport {
    myDataExport
  }
`);
