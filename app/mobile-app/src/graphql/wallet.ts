import { gql } from '@/generated/graphql';

/** Host wallet: balance + next payout cycle + transaction and withdrawal lists. */
export const MyWalletDocument = gql(`
  query MobileMyWallet {
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
      source
      reason
      created_at
    }
    myWithdrawals {
      id
      amount
      status
      payout_method
      scheduled_for
      reject_reason
      created_at
    }
  }
`);

/** Request a withdrawal from the wallet balance. */
export const RequestWithdrawalDocument = gql(`
  mutation MobileRequestWithdrawal($input: RequestWithdrawalInput!) {
    requestWithdrawal(input: $input) {
      id
      status
    }
  }
`);
