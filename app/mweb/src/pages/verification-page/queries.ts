import { gql } from '@apollo/client';

export const MY_VERIFICATIONS = gql`
  query MyVerifications {
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
  mutation SubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
    }
  }
`;

/** Submit the manual residential address — moves ADDRESS to Under Review. */
export const SUBMIT_ADDRESS_VERIFICATION = gql`
  mutation SubmitAddressVerification(
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

/** Upload an identity document (image or PDF) to ImageKit; returns its URL. */
export const UPLOAD_DOCUMENT = gql`
  mutation UploadVerificationDoc(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $allow_documents: Boolean
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      allow_documents: $allow_documents
    ) {
      url
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

/** Identical strings to the native app (CLAUDE rule 27). */
export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  IDENTITY: 'Identity',
  ADDRESS: 'Address',
  EMAIL: 'Email',
};

export const STATUS_META: Record<
  VerificationStatus,
  { label: string; color: 'default' | 'warning' | 'success' | 'error' }
> = {
  NOT_SUBMITTED: { label: 'Not Verified', color: 'default' },
  PENDING: { label: 'Under review', color: 'warning' },
  APPROVED: { label: 'Verified', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  VERIFIED_BY_APP: { label: 'Verified by the App', color: 'success' },
};

/** Max identity document size — 4 MB (B22). */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;
