import { gql, type TypedDocumentNode } from '@apollo/client';

/** Someone waiting to hear that a product is back. */
export interface StoreStockAlertRow {
  id: string;
  email: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  notified_at: string | null;
  created_at: string;
}

export const STORE_STOCK_ALERTS_TABLE = gql`
  query StoreStockAlertsTable($query: TableQueryInput) {
    storeStockAlertsTable(query: $query) {
      total
      rows {
        id
        email
        product_id
        product_name
        variant_id
        notified_at
        created_at
      }
    }
  }
`;

export const SEND_BACK_IN_STOCK: TypedDocumentNode<{ storeSendBackInStock: number }> = gql`
  mutation StoreSendBackInStock {
    storeSendBackInStock
  }
`;
