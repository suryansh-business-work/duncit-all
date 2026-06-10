import { gql } from '@apollo/client';

export const REQUEST_PASSWORD_RESET_OTP = gql`
  mutation RequestPasswordResetOtp($email: String!) {
    requestPasswordResetOtp(email: $email) {
      ok
      dev_otp
    }
  }
`;

export const RESET_PASSWORD_WITH_OTP = gql`
  mutation ResetPasswordWithOtp($input: ResetPasswordInput!) {
    resetPasswordWithOtp(input: $input)
  }
`;
