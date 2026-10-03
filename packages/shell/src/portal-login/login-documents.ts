import { gql, type TypedDocumentNode } from '@apollo/client';

/**
 * Every console sign-in document. The password door, the emailed-code door and
 * the authenticator step all hand their answer to the same `acceptSession`, so
 * they select the same `user { … }` — built here, once.
 */
const BASE_USER_FIELDS = 'user_id first_name last_name email roles';

function userSelection(extraUserFields: readonly string[]): string {
  return ['user {', BASE_USER_FIELDS, ...extraUserFields, '}'].join(' ');
}

/** What a finished sign-in hands to the page — the same payload every door produces. */
export interface SessionPayload {
  token?: string;
  user?: { roles?: string[] };
}

export function buildLoginMutation(mutationName: string, extraUserFields: readonly string[]) {
  return gql(`
    mutation ${mutationName}($input: LoginInput!) {
      login(input: $input) {
        token
        ${userSelection(extraUserFields)}
      }
    }
  `);
}

/** The same session a password produces, from a code instead. */
export function buildOtpLoginMutation(extraUserFields: readonly string[]) {
  return gql(`
    mutation ConsoleOtpLogin($input: PortalLoginOtpInput!) {
      loginWithPortalOtp(input: $input) {
        token
        ${userSelection(extraUserFields)}
      }
    }
  `);
}

/** The authenticator step: the challenge a door refused with, plus the code. */
export function buildCompleteTwoFactorMutation(
  extraUserFields: readonly string[],
): TypedDocumentNode<
  { completeTwoFactorLogin: SessionPayload },
  { input: { challenge_token: string; code: string } }
> {
  return gql(`
    mutation ConsoleCompleteTwoFactorLogin($input: TwoFactorLoginInput!) {
      completeTwoFactorLogin(input: $input) {
        token
        ${userSelection(extraUserFields)}
      }
    }
  `);
}

export const REQUEST_OTP = gql(`
  mutation ConsoleRequestLoginOtp($input: PortalLoginOtpRequestInput!) {
    requestPortalLoginOtp(input: $input) {
      ok
    }
  }
`);
