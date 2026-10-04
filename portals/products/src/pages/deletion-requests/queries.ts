import { gql } from '@apollo/client';

/** Products portal › Delete Requests: the partners' brand/product deletion requests. */

const REQUEST_FIELDS = `
  id
  request_no
  kind
  brand_id
  product_id
  parent_id
  brand_name
  product_name
  mode
  reason
  scheduled_for
  status
  open_orders_at_request
  requested_by_name
  reviewed_by
  reviewed_at
  review_note
  cancelled_orders
  failed_refunds
  blocked_reason
  last_checked_at
  completed_at
  created_at
`;

export const CATALOG_DELETION_TABLE = gql`
  query CatalogDeletionRequestsTable($kind: CatalogDeletionKind!, $query: TableQueryInput, $parent_id: ID) {
    catalogDeletionRequestsTable(kind: $kind, query: $query, parent_id: $parent_id) {
      total
      rows {
        ${REQUEST_FIELDS}
      }
    }
  }
`;

export const CATALOG_DELETION_DETAIL = gql`
  query CatalogDeletionRequest($id: ID!) {
    catalogDeletionRequest(id: $id) {
      request {
        ${REQUEST_FIELDS}
        events {
          action
          note
          by
          at
        }
      }
      impact {
        open_orders
        open_returns
        orders {
          id
          order_no
          fulfilment_status
          fulfilment_method
          created_at
          total
          currency_symbol
          units
        }
        products {
          id
          product_name
          is_active
        }
      }
    }
  }
`;

export const REVIEW_CATALOG_DELETION = gql`
  mutation ReviewCatalogDeletion($id: ID!, $approve: Boolean!, $note: String) {
    reviewCatalogDeletion(id: $id, approve: $approve, note: $note) {
      ${REQUEST_FIELDS}
    }
  }
`;

export const CATALOG_DELETION_WINDOW = gql`
  query CatalogDeletionWindow {
    catalogDeletionWindow {
      min_days
      max_days
      earliest
      latest
      updated_at
    }
  }
`;

export const UPDATE_CATALOG_DELETION_WINDOW = gql`
  mutation UpdateCatalogDeletionWindow($input: UpdateCatalogDeletionWindowInput!) {
    updateCatalogDeletionWindow(input: $input) {
      min_days
      max_days
      earliest
      latest
      updated_at
    }
  }
`;

export type DeletionKind = 'PRODUCT' | 'BRAND';

export interface DeletionRequestRow {
  id: string;
  request_no: string;
  kind: DeletionKind;
  brand_id: string;
  product_id: string | null;
  parent_id: string | null;
  brand_name: string;
  product_name: string;
  mode: 'WAIT_FOR_ORDERS' | 'CANCEL_AND_REFUND';
  reason: string;
  scheduled_for: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'COMPLETED';
  open_orders_at_request: number;
  requested_by_name: string;
  reviewed_by: string;
  reviewed_at: string | null;
  review_note: string;
  cancelled_orders: number;
  failed_refunds: number;
  blocked_reason: string;
  last_checked_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DeletionDetail {
  request: DeletionRequestRow & { events: { action: string; note: string; by: string; at: string }[] };
  impact: {
    open_orders: number;
    open_returns: number;
    orders: {
      id: string;
      order_no: string;
      fulfilment_status: string;
      fulfilment_method: string;
      created_at: string;
      total: number;
      currency_symbol: string;
      units: number;
    }[];
    products: { id: string; product_name: string; is_active: boolean }[];
  };
}
