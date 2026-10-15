import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  ADMIN_FOOD_MENU_QUERY,
  FOOD_MENU_CONFIG_QUERY,
  FOOD_RAZORPAY_CONNECTIONS_QUERY,
  OWNER_FOOD_MENU_QUERY,
  UPDATE_VENUE_FOOD_MENU_MUTATION,
  type FoodMenuConfig,
  type FoodMenuVenue,
  type FoodRazorpayConnection,
  type FoodMenuSaveInput,
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
  FOOD_CURRENCY_QUERY,
  VENUE_TABLE_STICKERS_QUERY,
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

export const OWNER_FOOD_MENU: TypedDocumentNode<{ myVenue: FoodMenuVenue | null }, { venue_id: string }> =
  gql(OWNER_FOOD_MENU_QUERY);

export const ADMIN_FOOD_MENU: TypedDocumentNode<{ venue: FoodMenuVenue | null }, { venue_id: string }> =
  gql(ADMIN_FOOD_MENU_QUERY);

export const FOOD_MENU_CONFIG: TypedDocumentNode<{ venueRegistrationConfig: FoodMenuConfig }, Record<string, never>> =
  gql(FOOD_MENU_CONFIG_QUERY);

export const UPDATE_VENUE_FOOD_MENU: TypedDocumentNode<
  { updateApprovedVenue: FoodMenuVenue },
  { venue_id: string; input: FoodMenuSaveInput }
> = gql(UPDATE_VENUE_FOOD_MENU_MUTATION);

export const FOOD_RAZORPAY_CONNECTIONS: TypedDocumentNode<
  { myPartnerIntegrations: FoodRazorpayConnection[] },
  Record<string, never>
> = gql(FOOD_RAZORPAY_CONNECTIONS_QUERY);

export const FOOD_CURRENCY: TypedDocumentNode<
  { publicFinanceSettings: { currency_symbol: string } | null },
  Record<string, never>
> = gql(FOOD_CURRENCY_QUERY);

export const VENUE_TABLE_STICKERS: TypedDocumentNode<
  { myVenueTableStickersPdfBase64: string },
  { venueId: string; headline: string; tableHeading: string }
> = gql(VENUE_TABLE_STICKERS_QUERY);
