import { gql } from '@apollo/client';

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
