import { gql } from '@apollo/client';

/**
 * Admin › User › Shop Orders: the member's Pod Shop orders. The account is the
 * query's own argument (`user_id`) and the server pins the shop to POD_SHOP,
 * so no client filter can widen it to other buyers or the pet store.
 */
export const USER_SHOP_ORDERS_TABLE = gql`
  query AdminUserShopOrders($user_id: ID!, $query: TableQueryInput) {
    userProductOrdersTable(user_id: $user_id, query: $query) {
      total
      rows {
        id
        order_no
        created_at
        currency_symbol
        total
        fulfilment_method
        fulfilment_status
        delivered_at
        cancelled_at
        cancel_reason
        pod {
          id
          pod_title
        }
        line_items {
          name
          variant_label
          qty
        }
        refund {
          status
          amount
          coins
        }
      }
    }
  }
`;

export interface UserShopOrderRow {
  id: string;
  order_no: string;
  created_at: string;
  currency_symbol: string;
  total: number;
  fulfilment_method: string;
  fulfilment_status: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  pod: { id: string; pod_title: string } | null;
  line_items: { name: string; variant_label: string; qty: number }[];
  refund: { status: string; amount: number; coins: number };
}
