import { gql } from '@apollo/client';

/** A shopper's cart as the recovery table lists it. */
export interface StoreCartRow {
  id: string;
  email: string;
  phone: string;
  is_guest: boolean;
  item_count: number;
  value: number;
  /** "Name × qty" per line. */
  items: string[];
  last_activity_at: string;
  reminded_at: string | null;
  created_at: string;
}

export const STORE_CARTS_TABLE = gql`
  query StoreCartsTable($query: TableQueryInput, $abandoned_only: Boolean) {
    storeCartsTable(query: $query, abandoned_only: $abandoned_only) {
      total
      rows {
        id
        email
        phone
        is_guest
        item_count
        value
        items
        last_activity_at
        reminded_at
        created_at
      }
    }
  }
`;

export const REMIND_CART = gql`
  mutation StoreRemindCart($id: ID!) {
    storeRemindCart(id: $id)
  }
`;
