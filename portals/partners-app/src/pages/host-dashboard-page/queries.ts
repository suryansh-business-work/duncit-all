import { gql } from '@apollo/client';

/**
 * Everything the Host Dashboard's header + tiles need in one round trip —
 * the same set the native HostDashboardScreen reads (rule 27 parity).
 */
export const HOST_DASHBOARD = gql`
  query PartnerHostDashboard {
    me {
      user_id
      full_name
      roles
    }
    myWallet {
      balance
      currency_symbol
      next_payout_at
    }
    myHostEarningsSummary {
      currency_symbol
      lifetime_earnings
      pending_amount
      pods_completed
      this_month_earnings
    }
    myAccountHealth {
      total_score
      band
    }
  }
`;

/** Pod status split + the monthly host-earnings series behind the charts. */
export const HOST_INSIGHTS = gql`
  query PartnerHostInsights($months: Int) {
    hostInsights(months: $months) {
      status_counts {
        upcoming
        ongoing
        completed
        cancelled
      }
      monthly_earnings {
        month
        total
      }
    }
  }
`;

export interface HostWallet {
  balance: number;
  currency_symbol: string;
  next_payout_at?: string | null;
}

export interface HostEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

export interface HostAccountHealth {
  total_score: number;
  band: 'RED' | 'YELLOW' | 'GREEN';
}

export interface HostStatusCounts {
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

export interface HostMonthlyEarning {
  month: string;
  total: number;
}

export interface HostInsights {
  status_counts: HostStatusCounts;
  monthly_earnings: HostMonthlyEarning[];
}

export const emptyHostEarnings: HostEarningsSummary = {
  currency_symbol: '₹',
  lifetime_earnings: 0,
  pending_amount: 0,
  pods_completed: 0,
  this_month_earnings: 0,
};

export const emptyStatusCounts: HostStatusCounts = {
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
};
