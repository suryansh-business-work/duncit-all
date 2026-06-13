import { gql } from '@apollo/client';

export const WITHDRAWALS = gql`
  query Withdrawals($status: WithdrawalStatus) {
    withdrawalRequests(status: $status) {
      id
      withdrawal_id
      beneficiary_name
      beneficiary_email
      amount
      status
      payout_method
      account_holder_name
      account_number
      ifsc_code
      upi_id
      scheduled_for
      reject_reason
      requested_at
    }
  }
`;

export const REVIEW_WITHDRAWAL = gql`
  mutation ReviewWithdrawal($id: ID!, $input: ReviewWithdrawalInput!) {
    reviewWithdrawal(withdrawal_id: $id, input: $input) {
      id
      status
    }
  }
`;
