import { gql, type TypedDocumentNode } from '@apollo/client';
import type { WalletStatementVariables } from '@duncit/forms/schemas';
import type { WalletStatementFileData } from './statement/statement.types';

export const MY_WALLET = gql`
  query MyWallet {
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

/** The caller's own wallet statement for a period, as a PDF or CSV file (base64). */
export const WALLET_STATEMENT_FILE: TypedDocumentNode<WalletStatementFileData, WalletStatementVariables> = gql`
  query WalletStatementFile($input: WalletStatementInput!, $format: WalletStatementFormat!) {
    myWalletStatementFile(input: $input, format: $format) {
      filename
      mime
      content_base64
      transaction_count
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
