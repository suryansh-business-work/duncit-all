import { gql } from '@apollo/client';

export const MY_TRACKING_CONSENT = gql`
  query MyTrackingConsent {
    myTrackingConsent {
      analytics
      marketing
      decided_at
    }
  }
`;

export const SET_MY_TRACKING_CONSENT = gql`
  mutation SetMyTrackingConsent($input: TrackingConsentInput!) {
    setMyTrackingConsent(input: $input) {
      analytics
      marketing
      decided_at
    }
  }
`;

export const MY_DATA_EXPORT = gql`
  query MyDataExport {
    myDataExport
  }
`;

/** What a member allowed Duncit to store — the server's TrackingConsent. */
export interface TrackingConsent {
  analytics: boolean;
  marketing: boolean;
  decided_at: string;
}

export interface MyTrackingConsentData {
  myTrackingConsent: TrackingConsent | null;
}

export interface SetMyTrackingConsentVars {
  input: { analytics: boolean; marketing: boolean; surface: 'MWEB' };
}

export interface MyDataExportData {
  myDataExport: string;
}
