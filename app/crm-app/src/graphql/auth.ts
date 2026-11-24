import { gql } from '@/generated/graphql';

/**
 * Sign-in: the CRM portal's own console login (portal_key `crm`), so the
 * server applies the same portal gate, 2FA and Security Verification.
 */
export const CrmAppLoginDocument = gql(`
  mutation CrmAppLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`);

export const CrmAppTwoFactorDocument = gql(`
  mutation CrmAppTwoFactor($input: TwoFactorLoginInput!) {
    completeTwoFactorLogin(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`);

/** Who is signed in, re-read on launch so a role removed in the portal locks the app too. */
export const CrmAppMeDocument = gql(`
  query CrmAppMe {
    me { user_id first_name last_name email roles locale }
  }
`);

export const CrmAppSecurityChallengeDocument = gql(`
  query CrmAppSecurityChallenge {
    portalSecurityChallenge {
      policy_version
      reverify
      user_name
      sections { key title paragraphs }
      exception { id status reason decision_note expires_at }
    }
  }
`);

export const CrmAppSubmitSecurityDocument = gql(`
  mutation CrmAppSubmitSecurity($input: PortalSecurityVerificationInput!) {
    submitPortalSecurityVerification(input: $input) { token }
  }
`);

export const CrmAppRequestSecurityExceptionDocument = gql(`
  mutation CrmAppRequestSecurityException($input: PortalSecurityExceptionRequestInput!) {
    requestPortalSecurityException(input: $input) { id status reason decision_note expires_at }
  }
`);
