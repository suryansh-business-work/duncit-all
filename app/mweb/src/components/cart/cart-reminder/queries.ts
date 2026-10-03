import { gql } from '@apollo/client';

/** Products portal > Cart Settings — only the nudge half; the email half is
 * the server's business. Native twin: src/graphql/product-cart.ts. */
export const PRODUCT_CART_NUDGE_SETTINGS = gql`
  query ProductCartNudgeSettings {
    productCartSettings {
      nudge_enabled
      nudge_delay_minutes
      nudge_auto_hide_seconds
    }
  }
`;

export const SYNC_MY_PRODUCT_CART = gql`
  mutation SyncMyProductCart($lines: [ProductCartLineInput!]!) {
    syncMyProductCart(lines: $lines)
  }
`;
