import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

export const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** The "allow" half of the consent step: grants Google sign-in to an existing
 * email/password account and returns the same session a login would have. Sent
 * with the SAME id_token loginWithGoogle just rejected. */
export const LINK_GOOGLE_ACCOUNT = gql`
  mutation LinkGoogleAccount($input: GoogleAuthInput!) {
    linkGoogleAccount(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** Continue with OTP, step one — send a sign-in code to the chosen channel. */
export const REQUEST_LOGIN_OTP = gql`
  mutation RequestLoginOtp($input: RequestLoginOtpInput!) {
    requestLoginOtp(input: $input) {
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

/** Step two — trade a correct code for the same session a password produces. */
export const LOGIN_WITH_OTP = gql`
  mutation LoginWithOtp($input: LoginWithOtpInput!) {
    loginWithOtp(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;
