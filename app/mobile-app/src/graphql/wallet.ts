import { gql } from '@/generated/graphql';

/** Host wallet: balance + next payout cycle + transaction and withdrawal lists. */
export const MyWalletDocument = gql(`
  query MobileMyWallet {
    myWallet {
      balance
      currency_symbol
      payout_mode
      next_payout_at
      min_withdrawal_amount
      can_withdraw
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

/** The caller's own wallet statement for a period, as a PDF or CSV file (base64). */
export const WalletStatementFileDocument = gql(`
  query MobileWalletStatementFile($input: WalletStatementInput!, $format: WalletStatementFormat!) {
    myWalletStatementFile(input: $input, format: $format) {
      filename
      mime
      content_base64
      transaction_count
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
