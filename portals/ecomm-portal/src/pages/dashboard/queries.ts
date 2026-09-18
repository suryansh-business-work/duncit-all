import { gql, type TypedDocumentNode } from '@apollo/client';

export interface StoreDashboardPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface StoreTopProduct {
  product_id: string;
  name: string;
  image_url: string;
  units: number;
  revenue: number;
}

/** How the store did over a period, and what is waiting on the team now. */
export interface StoreDashboard {
  days: number;
  orders: number;
  cancelled: number;
  delivered: number;
  revenue: number;
  average_order_value: number;
  units: number;
  cod_share_pct: number;
  customers: number;
  new_customers: number;
  series: StoreDashboardPoint[];
  top_products: StoreTopProduct[];
  statuses: { status: string; count: number }[];
  to_ship: number;
  returns_open: number;
  out_of_stock: number;
  low_stock: number;
  abandoned_carts: number;
  listed_products: number;
}

export const STORE_DASHBOARD: TypedDocumentNode<{ storeDashboard: StoreDashboard }, { days: number }> = gql`
  query StoreDashboard($days: Int) {
    storeDashboard(days: $days) {
      days
      orders
      cancelled
      delivered
      revenue
      average_order_value
      units
      cod_share_pct
      customers
      new_customers
      series {
        date
        orders
        revenue
      }
      top_products {
        product_id
        name
        image_url
        units
        revenue
      }
      statuses {
        status
        count
      }
      to_ship
      returns_open
      out_of_stock
      low_stock
      abandoned_carts
      listed_products
    }
  }
`;

/** The periods the dashboard reports on — the server answers exactly these. */
export const PERIODS = [7, 30, 90, 365] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;
