import { gql } from '@apollo/client';

export const MY_VERIFICATIONS = gql`
  query PartnerMyVerifications {
    myVerifications {
      type
      status
      document_url
      reject_reason
      address {
        line1
        line2
        city
        state
        pincode
        country
      }
    }
  }
`;

/** Submit/replace the IDENTITY document — moves it to Under Review. */
export const SUBMIT_VERIFICATION = gql`
  mutation PartnerSubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
    }
  }
`;

/** Submit the manual residential address — moves ADDRESS to Under Review. */
export const SUBMIT_ADDRESS_VERIFICATION = gql`
  mutation PartnerSubmitAddressVerification(
    $line1: String!
    $line2: String
    $city: String!
    $state: String!
    $pincode: String!
    $country: String
  ) {
    submitAddressVerification(
      line1: $line1
      line2: $line2
      city: $city
      state: $state
      pincode: $pincode
      country: $country
    ) {
      type
      status
    }
  }
`;

export type VerificationType = 'IDENTITY' | 'ADDRESS' | 'EMAIL';
export type VerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'VERIFIED_BY_APP';

export interface VerificationAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
}

export interface Verification {
  type: VerificationType;
  status: VerificationStatus;
  document_url: string | null;
  reject_reason: string | null;
  address: VerificationAddress | null;
}

/** i18n keys — the English copy is identical to mWeb/native (CLAUDE rule 27). */
export const VERIFICATION_LABEL_KEYS: Record<VerificationType, string> = {
  IDENTITY: 'partners.verification.typeIdentity',
  ADDRESS: 'partners.verification.typeAddress',
  EMAIL: 'partners.verification.typeEmail',
};

export const STATUS_META: Record<
  VerificationStatus,
  { labelKey: string; color: 'default' | 'warning' | 'success' | 'error' }
> = {
  NOT_SUBMITTED: { labelKey: 'partners.verification.statusNotSubmitted', color: 'default' },
  PENDING: { labelKey: 'partners.verification.statusPending', color: 'warning' },
  APPROVED: { labelKey: 'partners.verification.statusApproved', color: 'success' },
  REJECTED: { labelKey: 'partners.verification.statusRejected', color: 'error' },
  VERIFIED_BY_APP: { labelKey: 'partners.verification.statusVerifiedByApp', color: 'success' },
};

/** Max identity document size — 4 MB, same client-side policy as mWeb/native. */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;
