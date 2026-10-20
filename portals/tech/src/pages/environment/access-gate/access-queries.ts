import { gql, type TypedDocumentNode } from '@apollo/client';
import type { EnvAccessCodeRequest, EnvAccessStatus, MutationVerifyEnvAccessCodeArgs } from '@duncit/gql-types';

const STATUS_FIELDS = 'unlocked expires_at sent_to';

/** Whether THIS session has typed the root admin's emailed code recently. */
export const ENV_ACCESS_STATUS: TypedDocumentNode<{ envAccessStatus: EnvAccessStatus }> = gql`
  query EnvAccessStatus {
    envAccessStatus { ${STATUS_FIELDS} }
  }
`;

export const REQUEST_ENV_ACCESS_CODE: TypedDocumentNode<{ requestEnvAccessCode: EnvAccessCodeRequest }> = gql`
  mutation RequestEnvAccessCode {
    requestEnvAccessCode { challenge_id expires_at resend_after_seconds sent_to }
  }
`;

export const VERIFY_ENV_ACCESS_CODE: TypedDocumentNode<
  { verifyEnvAccessCode: EnvAccessStatus },
  MutationVerifyEnvAccessCodeArgs
> = gql`
  mutation VerifyEnvAccessCode($challengeId: ID!, $code: String!) {
    verifyEnvAccessCode(challengeId: $challengeId, code: $code) { ${STATUS_FIELDS} }
  }
`;

export const LOCK_ENV_ACCESS: TypedDocumentNode<{ lockEnvAccess: EnvAccessStatus }> = gql`
  mutation LockEnvAccess {
    lockEnvAccess { ${STATUS_FIELDS} }
  }
`;
