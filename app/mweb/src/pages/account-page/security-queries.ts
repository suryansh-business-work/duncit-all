import { gql } from '@apollo/client';

/** The member's own open request, as both the panel and the post-login notice
 * read it. */
export interface PendingRequest {
  id: string;
  request_id: string;
  status: string;
  requested_at: string;
  scheduled_delete_at: string;
  days_remaining: number | null;
}

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
const DELETION_REQUEST_FIELDS = `
  id
  request_id
  status
  requested_at
  scheduled_delete_at
  days_remaining
`;

export const MY_ACCOUNT_DELETION_REQUEST = gql`
  query MyAccountDeletionRequest {
    myAccountDeletionRequest {
      ${DELETION_REQUEST_FIELDS}
    }
  }
`;

export const SUBMIT_ACCOUNT_DELETION_REQUEST = gql`
  mutation SubmitAccountDeletionRequest($input: SubmitAccountDeletionRequestInput!) {
    submitAccountDeletionRequest(input: $input) {
      ${DELETION_REQUEST_FIELDS}
    }
  }
`;

/** The window, so the warning quotes the number the server will actually stamp
 * the request with rather than a "30" hardcoded next to the button. */
export const ACCOUNT_DELETION_SETTINGS = gql`
  query AccountDeletionSettings {
    accountDeletionSettings {
      retention_days
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
