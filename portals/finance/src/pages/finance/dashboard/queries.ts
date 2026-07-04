import { gql } from '@apollo/client';

export const FINANCE_DASHBOARD_STATS = gql`
  query FinanceDashboardStats {
    financeDashboardStats {
      currency_symbol
      total_revenue {
        total
        this_month
        last_month
        mom_change_pct
      }
      duncit_revenue {
        total
        this_month
        last_month
        mom_change_pct
      }
      gst_collected {
        total
        this_month
        last_month
        mom_change_pct
      }
      pending_payouts {
        total
        this_month
        last_month
        mom_change_pct
      }
      completed_payouts {
        total
        this_month
        last_month
        mom_change_pct
      }
    }
  }
`;

export interface FinanceStat {
  total: number;
  this_month: number;
  last_month: number;
  mom_change_pct: number;
}

export interface FinanceDashboardStats {
  currency_symbol: string;
  total_revenue: FinanceStat;
  duncit_revenue: FinanceStat;
  gst_collected: FinanceStat;
  pending_payouts: FinanceStat;
  completed_payouts: FinanceStat;
}
