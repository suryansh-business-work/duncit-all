import { gql } from '@apollo/client';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  PREVIEW_VENUE_FOOD_COUPON_QUERY,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  type PreviewVenueFoodCouponInput,
  type VenueFoodCouponPreview,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

// The documents live in @duncit/utils so the native app sends the same ones.
export const PLACE_VENUE_FOOD_ORDER = gql(PLACE_VENUE_FOOD_ORDER_MUTATION);
export const VERIFY_VENUE_FOOD_ORDER = gql(VERIFY_VENUE_FOOD_ORDER_MUTATION);
export const VENUE_FOOD_ORDER = gql(VENUE_FOOD_ORDER_QUERY);
export const PREVIEW_VENUE_FOOD_COUPON = gql(PREVIEW_VENUE_FOOD_COUPON_QUERY);

export interface PlaceVenueFoodOrderData {
  placeVenueFoodOrder: VenueFoodOrderPlacement;
}

export interface VenueFoodOrderData {
  venueFoodOrder: VenueFoodOrder | null;
}

export interface PreviewVenueFoodCouponData {
  previewVenueFoodCoupon: VenueFoodCouponPreview;
}

export interface PreviewVenueFoodCouponVars {
  input: PreviewVenueFoodCouponInput;
}
