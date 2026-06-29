export interface DashboardMetrics {
  total_earning: number;
  number_of_pods: number;
  pods_earning: number;
  venue_earning: number;
  host_earning: number;
  product_earning: number;
  added_slots: number;
}

export type DashboardTab = 'venue' | 'host' | 'products';

export interface DashboardRange {
  from: Date;
  to: Date;
}