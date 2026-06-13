/** Shared types for the host's wallet withdrawal request. */

export type WithdrawMethod = 'UPI' | 'IMPS' | 'NEFT';

export interface WithdrawValues {
  amount: string;
  payout_method: WithdrawMethod;
  upi_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}

export const blankWithdrawValues: WithdrawValues = {
  amount: '',
  payout_method: 'UPI',
  upi_id: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
};
