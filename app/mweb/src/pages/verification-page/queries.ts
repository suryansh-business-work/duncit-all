import { gql } from '@apollo/client';

export const MY_VERIFICATIONS = gql`
  query MyVerifications {
    myVerifications {
      type
      status
      document_url
      reject_reason
    }
  }
`;

export const SUBMIT_VERIFICATION = gql`
  mutation SubmitVerification($type: VerificationType!, $document_url: String!) {
    submitVerification(type: $type, document_url: $document_url) {
      type
      status
      document_url
    }
  }
`;

export const VERIFICATION_LABELS: Record<string, string> = {
  IDENTITY: 'Identity Verification',
  ADDRESS: 'Address Verification',
  PHONE: 'Phone Verification',
  EMAIL: 'Email Verification',
  BANK_ACCOUNT: 'Bank Account Verification',
  POLICE: 'Police Verification',
  SELFIE: 'Selfie Verification',
};

export type VerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Verification {
  type: string;
  status: VerificationStatus;
  document_url: string | null;
  reject_reason: string | null;
}

export const STATUS_META: Record<
  VerificationStatus,
  { label: string; color: 'default' | 'warning' | 'success' | 'error' }
> = {
  NOT_SUBMITTED: { label: 'Not submitted', color: 'default' },
  PENDING: { label: 'Under review', color: 'warning' },
  APPROVED: { label: 'Verified', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
};
