import { gql, type TypedDocumentNode } from '@apollo/client';

export type SubscriptionMode = 'COD_AUTO' | 'REMIND';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

/** One subscribe-and-save plan: what repeats, how often, and how it last ran. */
export interface StoreSubscriptionRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  product_id: string;
  product_name: string;
  variant_label: string;
  qty: number;
  frequency_weeks: number;
  mode: SubscriptionMode;
  status: SubscriptionStatus;
  next_run_at: string | null;
  last_run_at: string | null;
  last_order_no: string;
  run_count: number;
  failures: number;
  created_at: string;
}

const SUBSCRIPTION_FIELDS = `
  id
  buyer_name
  buyer_email
  product_id
  product_name
  variant_label
  qty
  frequency_weeks
  mode
  status
  next_run_at
  last_run_at
  last_order_no
  run_count
  failures
  created_at
`;

export const STORE_SUBSCRIPTIONS_TABLE = gql`
  query StoreSubscriptionsTable($query: TableQueryInput) {
    storeSubscriptionsTable(query: $query) {
      total
      rows {
        ${SUBSCRIPTION_FIELDS}
      }
    }
  }
`;

export const SET_SUBSCRIPTION_STATUS = gql`
  mutation StoreAdminSetSubscriptionStatus($id: ID!, $status: StoreSubscriptionStatus!) {
    storeAdminSetSubscriptionStatus(id: $id, status: $status) {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`;

/** The store's autoship terms, stated in the page header. */
export const AUTOSHIP_TERMS: TypedDocumentNode<{
  storeAdminSettings: { autoship_enabled: boolean; autoship_discount_pct: number };
}> = gql`
  query StoreAutoshipTerms {
    storeAdminSettings {
      autoship_enabled
      autoship_discount_pct
    }
  }
`;

export const SUBSCRIPTION_MODE_KEYS: Record<SubscriptionMode, string> = {
  COD_AUTO: 'ecommPortal.autoship.modeCodAuto',
  REMIND: 'ecommPortal.autoship.modeRemind',
};

export const SUBSCRIPTION_STATUS_KEYS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'ecommPortal.autoship.statusActive',
  PAUSED: 'ecommPortal.autoship.statusPaused',
  CANCELLED: 'ecommPortal.autoship.statusCancelled',
};
