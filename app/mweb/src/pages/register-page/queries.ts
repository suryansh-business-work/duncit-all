import { gql, type TypedDocumentNode } from '@apollo/client';
import type { QuerySocialSignupStatusArgs, SocialSignupStatus } from '@duncit/gql-types';

/**
 * Signup step four, in two halves, and then the door that spends them.
 *
 * The code is asked for and proved while there is still no account — that is
 * what makes the step unskippable — and `register`/`signupWithGoogle` are only
 * called with the token it returns.
 */
export const REQUEST_SIGNUP_OTP = gql`
  mutation RequestSignupWhatsAppOtp($ext: String!, $num: String!, $email: String) {
    requestSignupWhatsAppOtp(phone_extension: $ext, phone_number: $num, email: $email) {
      ok
      dev_otp
    }
  }
`;

export const VERIFY_SIGNUP_OTP = gql`
  mutation VerifySignupWhatsAppOtp($ext: String!, $num: String!, $otp: String!) {
    verifySignupWhatsAppOtp(phone_extension: $ext, phone_number: $num, otp: $otp) {
      ok
      whatsapp_token
    }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

export const SIGNUP_APPLE = gql`
  mutation SignupWithApple($input: AppleSignupInput!) {
    signupWithApple(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`;

export const SIGNUP_GOOGLE = gql`
  mutation SignupWithGoogle($input: GoogleSignupInput!) {
    signupWithGoogle(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`;

/**
 * Asked the moment Google or Apple returns, before the policy gate: is this
 * person already on Duncit? Read-only on the server — no session, no sign-in
 * notice — so an existing account is offered "log in" and nothing else happens.
 */
export const SOCIAL_SIGNUP_STATUS: TypedDocumentNode<
  { socialSignupStatus: SocialSignupStatus },
  QuerySocialSignupStatusArgs
> = gql`
  query SocialSignupStatus($input: SocialSignupStatusInput!) {
    socialSignupStatus(input: $input) {
      exists
      email
    }
  }
`;
