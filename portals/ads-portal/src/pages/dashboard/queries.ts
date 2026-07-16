import { gql } from '@apollo/client';

/**
 * Advertiser KPIs for the dashboard. Counts bucket every ad by its DERIVED
 * status, so `approved` means approved-but-not-started.
 */
export interface AdsDashboardStats {
  total: number;
  pending: number;
  approved: number;
  live: number;
  rejected: number;
  expired: number;
  total_estimated_cost: number;
  total_approved_cost: number;
  live_spend: number;
  next_start_at?: string | null;
  next_start_title?: string | null;
  currency_symbol: string;
}

export const MY_ADS_DASHBOARD = gql`
  query MyAdsDashboard {
    myAdsDashboard {
      total
      pending
      approved
      live
      rejected
      expired
      total_estimated_cost
      total_approved_cost
      live_spend
      next_start_at
      next_start_title
      currency_symbol
    }
  }
`;
