import { gql } from '@apollo/client';

/** A STORE-scoped coupon — only redeemable at the pet store's checkout. */
export interface StoreCoupon {
  id: string;
  code: string;
  description: string;
  discount_pct: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  per_user_limit: number | null;
  min_order_amount: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

const COUPON_FIELDS = `
  id
  code
  description
  discount_pct
  valid_from
  valid_until
  max_uses
  per_user_limit
  min_order_amount
  used_count
  is_active
  created_at
`;

export const STORE_COUPONS_TABLE = gql`
  query StoreCouponsTable($query: TableQueryInput) {
    storeCouponsTable(query: $query) {
      total
      rows {
        ${COUPON_FIELDS}
      }
    }
  }
`;

export const SAVE_COUPON = gql`
  mutation StoreSaveCoupon($id: ID, $input: CreateCouponInput!) {
    storeSaveCoupon(id: $id, input: $input) {
      ${COUPON_FIELDS}
    }
  }
`;

export const DELETE_COUPON = gql`
  mutation StoreDeleteCoupon($id: ID!) {
    storeDeleteCoupon(id: $id)
  }
`;
