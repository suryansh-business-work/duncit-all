import { gql } from '@apollo/client';

/** Auth-guarded account-security mutations (mirror the server resolvers). */
export const REQUEST_PASSWORD_CHANGE_OTP = gql`
  mutation RequestPasswordChangeOtp($input: RequestPasswordChangeInput!) {
    requestPasswordChangeOtp(input: $input) {
      ok
    }
  }
`;

export const CHANGE_PASSWORD_WITH_OTP = gql`
  mutation ChangePasswordWithOtp($input: ChangePasswordInput!) {
    changePasswordWithOtp(input: $input)
  }
`;

export const REQUEST_ACCOUNT_DELETION_OTP = gql`
  mutation RequestAccountDeletionOtp {
    requestAccountDeletionOtp {
      ok
    }
  }
`;

export const DELETE_MY_ACCOUNT = gql`
  mutation DeleteMyAccount($input: DeleteMyAccountInput!) {
    deleteMyAccount(input: $input)
  }
`;
