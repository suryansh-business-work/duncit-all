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

/*
  Deletion is a REQUEST now, not an act. The code still proves who is asking;
  what it buys is a row in the Tech portal's queue. Everything below reads or
  writes that request — nothing here removes an account.
*/
export const MY_ACCOUNT_DELETION_REQUEST = gql`
  query MyAccountDeletionRequest {
    myAccountDeletionRequest {
      id
      request_id
      status
      requested_at
    }
  }
`;

export const SUBMIT_ACCOUNT_DELETION_REQUEST = gql`
  mutation SubmitAccountDeletionRequest($input: SubmitAccountDeletionRequestInput!) {
    submitAccountDeletionRequest(input: $input) {
      id
      request_id
      status
      requested_at
    }
  }
`;

export const CANCEL_MY_ACCOUNT_DELETION_REQUEST = gql`
  mutation CancelMyAccountDeletionRequest {
    cancelMyAccountDeletionRequest {
      id
      status
    }
  }
`;
