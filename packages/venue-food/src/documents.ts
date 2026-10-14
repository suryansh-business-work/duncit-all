import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  CANCEL_VENUE_FOOD_ORDER_MUTATION,
  CREATE_VENUE_FOOD_COUPON_MUTATION,
  DELETE_VENUE_FOOD_COUPON_MUTATION,
  FOOD_OWNER_VENUES_QUERY,
  SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION,
  SET_VENUE_FOOD_ORDER_STATUS_MUTATION,
  UPDATE_VENUE_FOOD_COUPON_MUTATION,
  VENUE_FOOD_COUPONS_TABLE_QUERY,
  VENUE_FOOD_ORDERS_TABLE_QUERY,
  VENUE_FOOD_STATS_QUERY,
  type FoodOwnerCoupon,
  type FoodOwnerOrder,
  type FoodOwnerStats,
  type FoodOwnerVenue,
  type VenueFoodOrderStatus,
} from '@duncit/utils';
import type { FoodCouponInput } from '@duncit/forms/schemas';

/**
 * The food desk's documents, parsed once for Apollo. The text is
 * @duncit/utils' — the same strings the native app parses — so every surface
 * sends exactly the same operations.
 */

export const FOOD_OWNER_VENUES: TypedDocumentNode<{ myVenues: FoodOwnerVenue[] }, Record<string, never>> =
  gql(FOOD_OWNER_VENUES_QUERY);

export const VENUE_FOOD_STATS: TypedDocumentNode<
  { venueFoodStats: FoodOwnerStats },
  { venue_id: string; days: number }
> = gql(VENUE_FOOD_STATS_QUERY);

export const VENUE_FOOD_ORDERS_TABLE = gql(VENUE_FOOD_ORDERS_TABLE_QUERY);

export const SET_VENUE_FOOD_ORDER_STATUS: TypedDocumentNode<
  { setVenueFoodOrderStatus: FoodOwnerOrder },
  { order_id: string; status: VenueFoodOrderStatus }
> = gql(SET_VENUE_FOOD_ORDER_STATUS_MUTATION);

export const CANCEL_VENUE_FOOD_ORDER: TypedDocumentNode<
  { cancelVenueFoodOrder: FoodOwnerOrder },
  { order_id: string; reason: string }
> = gql(CANCEL_VENUE_FOOD_ORDER_MUTATION);

export const VENUE_FOOD_COUPONS_TABLE = gql(VENUE_FOOD_COUPONS_TABLE_QUERY);

export const CREATE_VENUE_FOOD_COUPON: TypedDocumentNode<
  { createVenueFoodCoupon: FoodOwnerCoupon },
  { input: FoodCouponInput & { venue_id: string } }
> = gql(CREATE_VENUE_FOOD_COUPON_MUTATION);

export const UPDATE_VENUE_FOOD_COUPON: TypedDocumentNode<
  { updateVenueFoodCoupon: FoodOwnerCoupon },
  { coupon_id: string; input: FoodCouponInput }
> = gql(UPDATE_VENUE_FOOD_COUPON_MUTATION);

export const SET_VENUE_FOOD_COUPON_ACTIVE: TypedDocumentNode<
  { setVenueFoodCouponActive: FoodOwnerCoupon },
  { coupon_id: string; is_active: boolean }
> = gql(SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION);

export const DELETE_VENUE_FOOD_COUPON: TypedDocumentNode<{ deleteVenueFoodCoupon: boolean }, { coupon_id: string }> =
  gql(DELETE_VENUE_FOOD_COUPON_MUTATION);
