import { gql } from '@apollo/client';

export const SEND_MONEY_CATEGORIES = ['SALARY', 'REFUND', 'REIMBURSEMENT', 'ADJUSTMENT', 'OTHER'] as const;
export type SendMoneyCategory = (typeof SEND_MONEY_CATEGORIES)[number];

export interface VerifiedAccount {
  id: string;
  source: string;
  label: string;
  payout_method: 'UPI' | 'IMPS' | 'NEFT';
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  verified_accounts: VerifiedAccount[];
}

const ACCOUNT_FIELDS = `
  id
  source
  label
  payout_method
  account_holder_name
  account_number
  ifsc_code
  upi_id
`;

/** What the form needs before it can render: the categories and whether payouts can run. */
export const SEND_MONEY_OPTIONS = gql`
  query SendMoneyOptions {
    sendMoneyOptions {
      categories
      payouts_configured
      currency_symbol
    }
  }
`;

export interface SendMoneyOptionsData {
  sendMoneyOptions: { categories: SendMoneyCategory[]; payouts_configured: boolean; currency_symbol: string };
}

/** The recipient dropdown's search. Accounts load on selection, not per result. */
export const SEND_MONEY_RECIPIENTS = gql`
  query SendMoneyRecipients($search: String!) {
    sendMoneyRecipients(search: $search, limit: 20) {
      id
      name
      email
      phone
    }
  }
`;

export const SEND_MONEY_RECIPIENT = gql`
  query SendMoneyRecipient($id: ID!) {
    sendMoneyRecipient(user_id: $id) {
      id
      name
      email
      phone
      verified_accounts {
        ${ACCOUNT_FIELDS}
      }
    }
  }
`;

export const SEND_MONEY = gql`
  mutation SendMoney($input: SendMoneyInput!) {
    sendMoney(input: $input) {
      id
      transfer_id
      status
    }
  }
`;

export const RETRY_SEND_MONEY_TRANSFER = gql`
  mutation RetrySendMoneyTransfer($id: ID!) {
    retrySendMoneyTransfer(transfer_id: $id) {
      id
      status
    }
  }
`;

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PAID' | 'FAILED';

export interface TransferRow {
  id: string;
  transfer_id: string;
  recipient_name: string;
  recipient_email: string;
  amount: number;
  category: SendMoneyCategory;
  reason: string;
  notes: string;
  supporting_reference: string;
  payout_method: string;
  /** HOST, VENUE or ECOMM_BRAND for a verified account; CUSTOM for one typed in. */
  account_source: string;
  initiated_by_name: string;
  approved_by_name: string;
  status: TransferStatus;
  razorpay_payout_id: string;
  utr: string;
  failure_reason: string;
  created_at: string;
}

/** Send Money Logs: every manual transfer with who sent it, why, and where the bank stands. */
export const SEND_MONEY_TRANSFERS_TABLE = gql`
  query SendMoneyTransfersTable($query: TableQueryInput) {
    sendMoneyTransfersTable(query: $query) {
      total
      rows {
        id
        transfer_id
        recipient_name
        recipient_email
        amount
        category
        reason
        notes
        supporting_reference
        payout_method
        account_source
        initiated_by_name
        approved_by_name
        status
        razorpay_payout_id
        utr
        failure_reason
        created_at
      }
    }
  }
`;
