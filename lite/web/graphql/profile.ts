import { gql, type TypedDocumentNode } from '@apollo/client';
import { LITE_USER_FIELDS, type LiteDisplayMode, type LiteMe, type LiteSignInVia, type LiteSocialLinks } from '../../shared/graphql/documents';

/** Every field optional: each settings section saves only its own part of the account. */
export interface LiteProfileInput {
  name?: string;
  handle?: string;
  bio?: string;
  avatar_url?: string;
  upi_id?: string;
  upi_name?: string;
  social?: Partial<LiteSocialLinks>;
  display_mode?: LiteDisplayMode;
}

export const LITE_UPDATE_PROFILE: TypedDocumentNode<{ liteUpdateProfile: LiteMe }, { input: LiteProfileInput }> = gql`
  mutation LiteUpdateProfile($input: LiteProfileInput!) {
    liteUpdateProfile(input: $input) {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;

export type LiteContactKind = 'EMAIL' | 'PHONE';

export interface LiteCodeRequest {
  ok: boolean;
  via: LiteSignInVia;
  expires_in_minutes: number;
  resend_after_seconds: number;
  test_code: string | null;
}

export const LITE_REQUEST_CONTACT_CODE: TypedDocumentNode<{ liteRequestContactCode: LiteCodeRequest }, { kind: LiteContactKind; value: string }> = gql`
  mutation LiteRequestContactCode($kind: LiteContactKind!, $value: String!) {
    liteRequestContactCode(kind: $kind, value: $value) {
      ok
      via
      expires_in_minutes
      resend_after_seconds
      test_code
    }
  }
`;

export const LITE_VERIFY_CONTACT: TypedDocumentNode<{ liteVerifyContact: LiteMe }, { kind: LiteContactKind; value: string; code: string }> = gql`
  mutation LiteVerifyContact($kind: LiteContactKind!, $value: String!, $code: String!) {
    liteVerifyContact(kind: $kind, value: $value, code: $code) {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;
