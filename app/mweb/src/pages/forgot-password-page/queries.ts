import { gql } from '@apollo/client';

/** Step one — find the account and send a code on the chosen channel. */
export const REQUEST_PASSWORD_RESET_CODE = gql`
  mutation RequestPasswordResetCode($input: PasswordResetLookupInput!) {
    requestPasswordResetCode(input: $input) {
      ok
      registered
      channel
      expires_at
      resend_after_seconds
      expires_in_minutes
      sent
      test_code
    }
  }
`;

/** Step two — prove the code and take the grant that sets the password. */
export const VERIFY_PASSWORD_RESET_CODE = gql`
  mutation VerifyPasswordResetCode($input: VerifyPasswordResetCodeInput!) {
    verifyPasswordResetCode(input: $input) {
      ok
      reset_token
    }
  }
`;

/** Step three — spend the grant. */
export const COMPLETE_PASSWORD_RESET = gql`
  mutation CompletePasswordReset($input: CompletePasswordResetInput!) {
    completePasswordReset(input: $input)
  }
`;
