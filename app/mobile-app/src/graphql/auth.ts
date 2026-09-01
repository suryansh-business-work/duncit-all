import { gql } from '@/generated/graphql';

/**
 * Auth GraphQL operations. The mobile app hits the same server as mWeb; these
 * mirror mWeb's REGISTER / login / Google mutations. Typed via codegen.
 */
export const RegisterDocument = gql(`
  mutation MobileRegister($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        onboarding_survey_completed
      }
    }
  }
`);

export const LoginDocument = gql(`
  mutation MobileLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        onboarding_survey_completed
      }
    }
  }
`);

/** Continue with OTP, step one — send a sign-in code to the chosen channel. */
export const RequestLoginOtpDocument = gql(`
  mutation MobileRequestLoginOtp($input: RequestLoginOtpInput!) {
    requestLoginOtp(input: $input) {
      ok
      registered
      channel
      expires_at
      resend_after_seconds
      expires_in_minutes
      test_code
    }
  }
`);

/** Step two — trade a correct code for the session a password would produce. */
export const LoginWithOtpDocument = gql(`
  mutation MobileLoginWithOtp($input: LoginWithOtpInput!) {
    loginWithOtp(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`);

/** Step one of recovery — find the account and send a code on its channel. */
export const RequestPasswordResetCodeDocument = gql(`
  mutation MobileRequestPasswordResetCode($input: PasswordResetLookupInput!) {
    requestPasswordResetCode(input: $input) {
      ok
      registered
      channel
      expires_at
      resend_after_seconds
      expires_in_minutes
      test_code
    }
  }
`);

/** Step two — prove the code and take the grant that sets the password. */
export const VerifyPasswordResetCodeDocument = gql(`
  mutation MobileVerifyPasswordResetCode($input: VerifyPasswordResetCodeInput!) {
    verifyPasswordResetCode(input: $input) {
      ok
      reset_token
    }
  }
`);

/** Step three — spend the grant. */
export const CompletePasswordResetDocument = gql(`
  mutation MobileCompletePasswordReset($input: CompletePasswordResetInput!) {
    completePasswordReset(input: $input)
  }
`);

export const SignupWithGoogleDocument = gql(`
  mutation MobileSignupWithGoogle($input: GoogleSignupInput!) {
    signupWithGoogle(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`);

export const LoginWithGoogleDocument = gql(`
  mutation MobileLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`);

/** The "allow" half of the consent step: grants Google sign-in to an existing
 * email/password account and returns the same session a login would have. Sent
 * with the SAME id_token loginWithGoogle just rejected. mWeb twin. */
export const LinkGoogleAccountDocument = gql(`
  mutation MobileLinkGoogleAccount($input: GoogleAuthInput!) {
    linkGoogleAccount(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`);
