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
