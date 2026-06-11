import { gql } from '@apollo/client';

export { PAYMENTS } from '../payment-logs-page/queries';
export { PAYMENT_RELEASE_REQUESTS } from '../payment-release-page/queries';

export const PUBLIC_FINANCE_SETTINGS = gql`
  query PublicFinanceSettings {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export interface DashboardPayment {
  total: number;
  platform_fee_amount: number;
  gst_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface DashboardRelease {
  status: string;
  amount_requested: number;
}
