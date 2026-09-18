import { gql } from '@apollo/client';

/** One buyer, folded from their pet-store orders by email. */
export interface StoreCustomerRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  is_guest: boolean;
  user_id: string | null;
  orders: number;
  cancelled: number;
  spent: number;
  last_order_at: string;
  first_order_at: string;
}

export const STORE_CUSTOMERS_TABLE = gql`
  query StoreCustomersTable($query: TableQueryInput) {
    storeCustomersTable(query: $query) {
      total
      rows {
        id
        email
        name
        phone
        is_guest
        user_id
        orders
        cancelled
        spent
        last_order_at
        first_order_at
      }
    }
  }
`;
