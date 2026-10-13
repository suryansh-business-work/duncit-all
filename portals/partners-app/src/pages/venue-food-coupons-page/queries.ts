import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationCreateVenueFoodCouponArgs,
  MutationDeleteVenueFoodCouponArgs,
  MutationSetVenueFoodCouponActiveArgs,
  MutationUpdateVenueFoodCouponArgs,
  VenueFoodCoupon,
} from '@duncit/gql-types';

/** One of a venue's food coupons as the table, its switch and the edit form read it. */
export type FoodCouponRow = Pick<
  VenueFoodCoupon,
  | 'id'
  | 'code'
  | 'description'
  | 'discount_pct'
  | 'min_order_amount'
  | 'valid_from'
  | 'valid_until'
  | 'max_uses'
  | 'per_phone_limit'
  | 'used_count'
  | 'is_active'
  | 'created_at'
>;

const FOOD_COUPON_FIELDS = `
  id
  code
  description
  discount_pct
  min_order_amount
  valid_from
  valid_until
  max_uses
  per_phone_limit
  used_count
  is_active
  created_at
`;

/** One venue's food coupons — server-scoped to its owner. */
export const VENUE_FOOD_COUPONS_TABLE = gql`
  query VenueFoodCouponsTable($venue_id: ID!, $query: TableQueryInput) {
    venueFoodCouponsTable(venue_id: $venue_id, query: $query) {
      total
      rows { ${FOOD_COUPON_FIELDS} }
    }
  }
`;

export const CREATE_VENUE_FOOD_COUPON: TypedDocumentNode<
  { createVenueFoodCoupon: FoodCouponRow },
  MutationCreateVenueFoodCouponArgs
> = gql`
  mutation CreateVenueFoodCoupon($input: CreateVenueFoodCouponInput!) {
    createVenueFoodCoupon(input: $input) { ${FOOD_COUPON_FIELDS} }
  }
`;

export const UPDATE_VENUE_FOOD_COUPON: TypedDocumentNode<
  { updateVenueFoodCoupon: FoodCouponRow },
  MutationUpdateVenueFoodCouponArgs
> = gql`
  mutation UpdateVenueFoodCoupon($coupon_id: ID!, $input: UpdateVenueFoodCouponInput!) {
    updateVenueFoodCoupon(coupon_id: $coupon_id, input: $input) { ${FOOD_COUPON_FIELDS} }
  }
`;

export const SET_VENUE_FOOD_COUPON_ACTIVE: TypedDocumentNode<
  { setVenueFoodCouponActive: FoodCouponRow },
  MutationSetVenueFoodCouponActiveArgs
> = gql`
  mutation SetVenueFoodCouponActive($coupon_id: ID!, $is_active: Boolean!) {
    setVenueFoodCouponActive(coupon_id: $coupon_id, is_active: $is_active) { ${FOOD_COUPON_FIELDS} }
  }
`;

export const DELETE_VENUE_FOOD_COUPON: TypedDocumentNode<
  { deleteVenueFoodCoupon: boolean },
  MutationDeleteVenueFoodCouponArgs
> = gql`
  mutation DeleteVenueFoodCoupon($coupon_id: ID!) {
    deleteVenueFoodCoupon(coupon_id: $coupon_id)
  }
`;
