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

export const RequestPasswordResetOtpDocument = gql(`
  mutation MobileRequestPasswordResetOtp($email: String!) {
    requestPasswordResetOtp(email: $email) {
      ok
      dev_otp
    }
  }
`);

export const ResetPasswordWithOtpDocument = gql(`
  mutation MobileResetPasswordWithOtp($input: ResetPasswordInput!) {
    resetPasswordWithOtp(input: $input)
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
