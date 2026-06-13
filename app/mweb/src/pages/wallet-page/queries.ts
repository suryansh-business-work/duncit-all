import { gql } from '@apollo/client';

export const MY_WALLET = gql`
  query MyWallet {
    myWallet {
      balance
      currency_symbol
      payout_mode
      next_payout_at
    }
    myWalletTransactions {
      id
      type
      amount
      balance_after
      source
      reason
      created_at
    }
    myWithdrawals {
      id
      withdrawal_id
      amount
      status
      payout_method
      scheduled_for
      reject_reason
      created_at
    }
  }
`;

export const REQUEST_WITHDRAWAL = gql`
  mutation RequestWithdrawal($input: RequestWithdrawalInput!) {
    requestWithdrawal(input: $input) {
      id
      status
    }
  }
`;
