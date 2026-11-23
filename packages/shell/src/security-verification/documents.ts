import { gql, type TypedDocumentNode } from '@apollo/client';

/** Where an alternative-verification request stands. */
export interface ExceptionStatus {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED' | 'EXPIRED';
  reason: string;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  expires_at: string | null;
}

export interface PolicySection {
  key: string;
  title: string;
  paragraphs: string[];
}

export interface PolicyLink {
  title: string;
  policy_type: string;
  url: string;
}

export interface Detected {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ip_location_is_approximate: boolean;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  user_agent: string | null;
  server_time: string;
}

export interface Challenge {
  portal_key: string;
  reverify: boolean;
  policy_version: string;
  notice_version: string;
  retention_days: number;
  user_name: string;
  sections: PolicySection[];
  links: PolicyLink[];
  detected: Detected;
  exception: ExceptionStatus | null;
}

export const PORTAL_SECURITY_CHALLENGE: TypedDocumentNode<{ portalSecurityChallenge: Challenge }> = gql(`
  query PortalSecurityChallenge {
    portalSecurityChallenge {
      portal_key
      reverify
      policy_version
      notice_version
      retention_days
      user_name
      sections { key title paragraphs }
      links { title policy_type url }
      detected {
        ip country region city ip_location_is_approximate browser os device_type user_agent server_time
      }
      exception { id status reason decision_note created_at decided_at expires_at }
    }
  }
`);

export const PORTAL_SECURITY_EXCEPTION: TypedDocumentNode<{ portalSecurityException: ExceptionStatus | null }> = gql(`
  query PortalSecurityException {
    portalSecurityException { id status reason decision_note created_at decided_at expires_at }
  }
`);

export interface VerificationVariables {
  input: {
    policy_version: string;
    consent: {
      authorized_person: boolean;
      credentials_not_shared: boolean;
      policies_acknowledged: boolean;
      location_consent: boolean;
    };
    location: { latitude: number; longitude: number; accuracy_meters: number } | null;
    exception_id: string | null;
    client: { timezone: string | null; language: string | null; platform: string | null };
  };
}

export const SUBMIT_PORTAL_SECURITY_VERIFICATION: TypedDocumentNode<
  { submitPortalSecurityVerification: { token: string; verified_at: string; policy_version: string; record_id: string } },
  VerificationVariables
> = gql(`
  mutation SubmitPortalSecurityVerification($input: PortalSecurityVerificationInput!) {
    submitPortalSecurityVerification(input: $input) { token verified_at policy_version record_id }
  }
`);

export const REQUEST_PORTAL_SECURITY_EXCEPTION: TypedDocumentNode<
  { requestPortalSecurityException: ExceptionStatus },
  { input: { reason: string; location_error: string | null } }
> = gql(`
  mutation RequestPortalSecurityException($input: PortalSecurityExceptionRequestInput!) {
    requestPortalSecurityException(input: $input) { id status reason decision_note created_at decided_at expires_at }
  }
`);
