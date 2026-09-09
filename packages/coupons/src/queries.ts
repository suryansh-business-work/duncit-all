import { gql } from '@apollo/client';

export const COUPON_FIELDS = gql`
  fragment CouponFields on Coupon {
    id
    code
    description
    discount_pct
    scope
    pod_id
    pod {
      id
      pod_title
    }
    valid_from
    valid_until
    max_uses
    per_user_limit
    min_order_amount
    used_count
    is_active
    created_at
    updated_at
  }
`;

export const COUPONS = gql`
  query Coupons($filter: CouponFilterInput) {
    coupons(filter: $filter) {
      ...CouponFields
    }
  }
  ${COUPON_FIELDS}
`;

export const COUPON = gql`
  query Coupon($id: ID!) {
    coupon(id: $id) {
      ...CouponFields
    }
  }
  ${COUPON_FIELDS}
`;

/** The detail page's headline figures. Money comes from the payments that spent
 * the code, so it is a query of its own rather than a field on Coupon. */
export const COUPON_STATS = gql`
  query CouponStats($id: ID!) {
    couponStats(id: $id) {
      used_count
      unique_users
      total_discount
      order_value
      remaining_uses
      last_redeemed_at
      currency_symbol
    }
  }
`;

export const COUPON_REDEMPTIONS_TABLE = gql`
  query CouponRedemptionsTable($id: ID!, $query: TableQueryInput) {
    couponRedemptionsTable(id: $id, query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        user_id
        user_name
        user_email
        user_phone
        pod_id
        description
        total
        coupon_discount
        status
        paid_at
        created_at
      }
    }
  }
`;

export const COUPONS_FOR_POD = gql`
  query CouponsForPod($pod_id: ID!) {
    couponsForPod(pod_id: $pod_id) {
      ...CouponFields
    }
  }
  ${COUPON_FIELDS}
`;

export const COUPONS_TABLE = gql`
  query CouponsTable($query: TableQueryInput) {
    couponsTable(query: $query) {
      total
      rows {
        ...CouponFields
      }
    }
  }
  ${COUPON_FIELDS}
`;

export const COUPONS_FOR_POD_TABLE = gql`
  query CouponsForPodTable($pod_id: ID!, $query: TableQueryInput) {
    couponsForPodTable(pod_id: $pod_id, query: $query) {
      total
      rows {
        ...CouponFields
      }
    }
  }
  ${COUPON_FIELDS}
`;

/** The pods a pod-scoped coupon can point at. Deliberately slim: the dialog
 * needs an id and a title, not the whole pod document the admin pods page
 * loads, and this query is what lets a portal without a pods page (Marketing)
 * still create a pod-scoped code. */
export const COUPON_PODS = gql`
  query CouponPods {
    pods {
      id
      pod_title
    }
  }
`;

export const CREATE_COUPON = gql`
  mutation CreateCoupon($input: CreateCouponInput!) {
    createCoupon(input: $input) {
      ...CouponFields
    }
  }
  ${COUPON_FIELDS}
`;

export const UPDATE_COUPON = gql`
  mutation UpdateCoupon($id: ID!, $input: UpdateCouponInput!) {
    updateCoupon(id: $id, input: $input) {
      ...CouponFields
    }
  }
  ${COUPON_FIELDS}
`;

export const DELETE_COUPON = gql`
  mutation DeleteCoupon($id: ID!) {
    deleteCoupon(id: $id)
  }
`;

export interface CouponStats {
  used_count: number;
  unique_users: number;
  total_discount: number;
  order_value: number;
  remaining_uses: number | null;
  last_redeemed_at: string | null;
  currency_symbol: string;
}

export interface CouponRedemptionRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_id: string | null;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  pod_id: string | null;
  description: string;
  total: number;
  coupon_discount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface CouponPodOption {
  id: string;
  title: string;
}

export interface CouponRow {
  id: string;
  code: string;
  description: string;
  discount_pct: number;
  scope: 'GLOBAL' | 'POD';
  pod_id: string | null;
  pod?: { id: string; pod_title: string } | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  per_user_limit: number | null;
  min_order_amount: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
