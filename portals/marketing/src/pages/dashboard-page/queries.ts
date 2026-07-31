import { gql } from '@apollo/client';

export const MARKETING_DASHBOARD = gql`
  query MarketingDashboard($days: Int) {
    marketingDashboard(days: $days) {
      days
      links {
        total_clicks
        unique_visitors
        conversions
        revenue
        conversion_rate
        active
        total
        daily {
          date
          count
        }
        platforms {
          label
          count
        }
        countries {
          label
          count
        }
        top {
          id
          label
          code
          clicks
          revenue
        }
      }
      campaigns {
        sent
        scheduled
        failed
        recipients
        opens
        clicks
        open_rate
        click_rate
        recent {
          campaign_id
          name
          sent_at
          recipient_count
          open_count
          click_count
          open_rate
        }
      }
      audience {
        lists
      }
      ads {
        live
        pending
      }
    }
  }
`;

export interface DashboardPoint {
  label: string;
  count: number;
}

export interface DashboardTopLink {
  id: string;
  label: string;
  code: string;
  clicks: number;
  revenue: number;
}

export interface DashboardRecentCampaign {
  campaign_id: string;
  name: string;
  sent_at?: string | null;
  recipient_count: number;
  open_count: number;
  click_count: number;
  open_rate: number;
}

export interface MarketingDashboard {
  days: number;
  links: {
    total_clicks: number;
    unique_visitors: number;
    conversions: number;
    revenue: number;
    conversion_rate: number;
    active: number;
    total: number;
    daily: { date: string; count: number }[];
    platforms: DashboardPoint[];
    countries: DashboardPoint[];
    top: DashboardTopLink[];
  };
  campaigns: {
    sent: number;
    scheduled: number;
    failed: number;
    recipients: number;
    opens: number;
    clicks: number;
    open_rate: number;
    click_rate: number;
    recent: DashboardRecentCampaign[];
  };
  audience: { lists: number };
  ads: { live: number; pending: number };
}
