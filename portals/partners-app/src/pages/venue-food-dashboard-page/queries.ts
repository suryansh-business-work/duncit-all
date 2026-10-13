import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  QueryVenueFoodStatsArgs,
  VenueFoodDailyPoint,
  VenueFoodFeedbackRow,
  VenueFoodStats,
  VenueFoodStatusCount,
  VenueFoodTopItem,
} from '@duncit/gql-types';

export type FoodStatusCount = Pick<VenueFoodStatusCount, 'status' | 'count'>;
export type FoodTopItem = Pick<VenueFoodTopItem, 'name' | 'quantity' | 'revenue'>;
export type FoodDailyPoint = Pick<VenueFoodDailyPoint, 'date' | 'orders' | 'revenue'>;
export type FoodFeedbackRow = Pick<
  VenueFoodFeedbackRow,
  'order_no' | 'customer_name' | 'rating' | 'comment' | 'images' | 'submitted_at'
>;

/** One venue's food numbers over the picked period, as the dashboard reads them. */
export type FoodStats = Pick<
  VenueFoodStats,
  | 'days'
  | 'currency_symbol'
  | 'orders'
  | 'revenue'
  | 'average_order'
  | 'discount_given'
  | 'coupon_orders'
  | 'served'
  | 'cancelled'
  | 'refunded'
  | 'invoice_downloads'
  | 'subscribe_opt_ins'
  | 'subscribers'
  | 'page_scans'
  | 'table_scans'
  | 'feedback_count'
  | 'average_rating'
> & {
  status_counts: FoodStatusCount[];
  top_items: FoodTopItem[];
  daily: FoodDailyPoint[];
  recent_feedback: FoodFeedbackRow[];
};

/** The food dashboard of one venue — server-scoped to its owner. `days` 0 is all time. */
export const VENUE_FOOD_STATS: TypedDocumentNode<{ venueFoodStats: FoodStats }, QueryVenueFoodStatsArgs> = gql`
  query VenueFoodStats($venue_id: ID!, $days: Int) {
    venueFoodStats(venue_id: $venue_id, days: $days) {
      days
      currency_symbol
      orders
      revenue
      average_order
      discount_given
      coupon_orders
      served
      cancelled
      refunded
      invoice_downloads
      subscribe_opt_ins
      subscribers
      page_scans
      table_scans
      feedback_count
      average_rating
      status_counts { status count }
      top_items { name quantity revenue }
      daily { date orders revenue }
      recent_feedback { order_no customer_name rating comment images submitted_at }
    }
  }
`;
