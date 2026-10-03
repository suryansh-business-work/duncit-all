import { gql, type TypedDocumentNode } from '@apollo/client';

/** A brand's sales over a window. Cancelled, failed and RTO orders are excluded server-side. */
export const BRAND_ANALYTICS: TypedDocumentNode<BrandAnalyticsData, BrandAnalyticsVars> = gql`
  query BrandAnalytics($brand_doc_id: ID!, $days: Int) {
    brandAnalytics(brand_doc_id: $brand_doc_id, days: $days) {
      days
      since
      orders
      units_sold
      gross_revenue
      net_earnings
      average_order_value
      product_views
      product_clicks
      total_products
      live_products
      trend {
        date
        orders
        gross_revenue
      }
      top_products {
        product_id
        name
        units_sold
        gross_revenue
        net_earnings
      }
    }
  }
`;

/** The windows the selector offers, in days. */
export const BRAND_ANALYTICS_WINDOWS = [7, 30, 90] as const;
export type BrandAnalyticsWindow = (typeof BRAND_ANALYTICS_WINDOWS)[number];
export const DEFAULT_BRAND_ANALYTICS_WINDOW: BrandAnalyticsWindow = 30;

export interface BrandAnalyticsPoint {
  /** A 'yyyy-MM-dd' calendar day; every day of the window, oldest first, zero-filled. */
  date: string;
  orders: number;
  gross_revenue: number;
}

export interface BrandTopProduct {
  product_id: string;
  name: string;
  units_sold: number;
  gross_revenue: number;
  net_earnings: number;
}

export interface BrandAnalytics {
  days: number;
  /** ISO timestamp the window starts at. */
  since: string;
  orders: number;
  units_sold: number;
  gross_revenue: number;
  net_earnings: number;
  average_order_value: number;
  product_views: number;
  product_clicks: number;
  total_products: number;
  live_products: number;
  trend: BrandAnalyticsPoint[];
  top_products: BrandTopProduct[];
}

export interface BrandAnalyticsData {
  brandAnalytics: BrandAnalytics;
}

export interface BrandAnalyticsVars {
  brand_doc_id: string;
  days: BrandAnalyticsWindow;
}

/** The most orders any single day of the window took; 0 when nothing sold. */
export const trendPeak = (trend: readonly BrandAnalyticsPoint[]): number =>
  Math.max(0, ...trend.map((point) => point.orders));

/** Each day's bar as a whole percentage of the busiest day; all zeros when nothing sold. */
export function trendBarPercents(trend: readonly BrandAnalyticsPoint[]): number[] {
  const peak = trendPeak(trend);
  return trend.map((point) => (peak === 0 ? 0 : Math.round((point.orders / peak) * 100)));
}
