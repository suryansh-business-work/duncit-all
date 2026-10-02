import { formatDate } from '@duncit/app-settings';

export const PAYOUT_LABEL: Record<string, string> = {
  IMMEDIATE: 'Paid immediately after approval',
  WEEKLY: 'Paid on the weekly payout cycle',
  MONTH_END: 'Paid at month end',
};
export const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

export const fmtDate = (iso: string) => {
  return formatDate(iso) || '—';
};

export interface WalletWithdrawal {
  id: string;
  amount: number;
  payout_method: string;
  created_at: string;
  reject_reason?: string | null;
  status: string;
}

export interface WalletTransaction {
  id: string;
  reason?: string | null;
  source: string;
  created_at: string;
  type: string;
  amount: number;
}
