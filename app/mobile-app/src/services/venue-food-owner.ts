import { parse } from 'graphql';
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
  type FoodTablePage,
  type VenueFoodOrderStatus,
} from '@duncit/utils';
import type { FoodCouponInput } from '@duncit/forms/schemas';

import { graphqlRequest } from '@/services/graphql.client';

/**
 * A venue's food desk — the owner's venues, the dashboard, the order board and
 * the coupons. The documents are @duncit/utils' strings, the very ones the
 * Partners console, the Venues console and mWeb send through
 * @duncit/venue-food, parsed once here exactly like services/food-order.ts.
 * Every call carries the session: the server answers only the venue's owner.
 */
const FOOD_OWNER_VENUES = parse(FOOD_OWNER_VENUES_QUERY);
const VENUE_FOOD_STATS = parse(VENUE_FOOD_STATS_QUERY);
const VENUE_FOOD_ORDERS_TABLE = parse(VENUE_FOOD_ORDERS_TABLE_QUERY);
const SET_VENUE_FOOD_ORDER_STATUS = parse(SET_VENUE_FOOD_ORDER_STATUS_MUTATION);
const CANCEL_VENUE_FOOD_ORDER = parse(CANCEL_VENUE_FOOD_ORDER_MUTATION);
const VENUE_FOOD_COUPONS_TABLE = parse(VENUE_FOOD_COUPONS_TABLE_QUERY);
const CREATE_VENUE_FOOD_COUPON = parse(CREATE_VENUE_FOOD_COUPON_MUTATION);
const UPDATE_VENUE_FOOD_COUPON = parse(UPDATE_VENUE_FOOD_COUPON_MUTATION);
const SET_VENUE_FOOD_COUPON_ACTIVE = parse(SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION);
const DELETE_VENUE_FOOD_COUPON = parse(DELETE_VENUE_FOOD_COUPON_MUTATION);

const AUTH = { auth: true } as const;

/** One page of a food table, newest first — the order board and the coupon list both read this way. */
export interface FoodPageQuery {
  page: number;
  page_size: number;
  sort_by: 'created_at';
  sort_dir: 'desc';
}

export async function fetchFoodOwnerVenues(): Promise<FoodOwnerVenue[]> {
  const data = await graphqlRequest<{ myVenues: FoodOwnerVenue[] }>(
    FOOD_OWNER_VENUES,
    undefined,
    AUTH,
  );
  return data.myVenues;
}

export async function fetchFoodStats(venueId: string, days: number): Promise<FoodOwnerStats> {
  const data = await graphqlRequest<
    { venueFoodStats: FoodOwnerStats },
    { venue_id: string; days: number }
  >(VENUE_FOOD_STATS, { venue_id: venueId, days }, AUTH);
  return data.venueFoodStats;
}

export async function fetchFoodOrdersPage(
  venueId: string,
  query: FoodPageQuery,
): Promise<FoodTablePage<FoodOwnerOrder>> {
  const data = await graphqlRequest<
    { venueFoodOrdersTable: FoodTablePage<FoodOwnerOrder> },
    { venue_id: string; query: FoodPageQuery }
  >(VENUE_FOOD_ORDERS_TABLE, { venue_id: venueId, query }, AUTH);
  return data.venueFoodOrdersTable;
}

export async function setFoodOrderStatus(
  orderId: string,
  status: VenueFoodOrderStatus,
): Promise<FoodOwnerOrder> {
  const data = await graphqlRequest<
    { setVenueFoodOrderStatus: FoodOwnerOrder },
    { order_id: string; status: VenueFoodOrderStatus }
  >(SET_VENUE_FOOD_ORDER_STATUS, { order_id: orderId, status }, AUTH);
  return data.setVenueFoodOrderStatus;
}

/** Cancel and refund in full — one write on the server, so a retry cannot refund twice. */
export async function cancelFoodOrder(orderId: string, reason: string): Promise<FoodOwnerOrder> {
  const data = await graphqlRequest<
    { cancelVenueFoodOrder: FoodOwnerOrder },
    { order_id: string; reason: string }
  >(CANCEL_VENUE_FOOD_ORDER, { order_id: orderId, reason }, AUTH);
  return data.cancelVenueFoodOrder;
}

export async function fetchFoodCouponsPage(
  venueId: string,
  query: FoodPageQuery,
): Promise<FoodTablePage<FoodOwnerCoupon>> {
  const data = await graphqlRequest<
    { venueFoodCouponsTable: FoodTablePage<FoodOwnerCoupon> },
    { venue_id: string; query: FoodPageQuery }
  >(VENUE_FOOD_COUPONS_TABLE, { venue_id: venueId, query }, AUTH);
  return data.venueFoodCouponsTable;
}

/** Creates a coupon for `venueId`, or — with `couponId` — saves an edit (the server reads the venue off it). */
export async function saveFoodCoupon(
  venueId: string,
  couponId: string | null,
  input: FoodCouponInput,
): Promise<FoodOwnerCoupon> {
  if (couponId) {
    const data = await graphqlRequest<
      { updateVenueFoodCoupon: FoodOwnerCoupon },
      { coupon_id: string; input: FoodCouponInput }
    >(UPDATE_VENUE_FOOD_COUPON, { coupon_id: couponId, input }, AUTH);
    return data.updateVenueFoodCoupon;
  }
  const data = await graphqlRequest<
    { createVenueFoodCoupon: FoodOwnerCoupon },
    { input: FoodCouponInput & { venue_id: string } }
  >(CREATE_VENUE_FOOD_COUPON, { input: { ...input, venue_id: venueId } }, AUTH);
  return data.createVenueFoodCoupon;
}

export async function setFoodCouponActive(
  couponId: string,
  isActive: boolean,
): Promise<FoodOwnerCoupon> {
  const data = await graphqlRequest<
    { setVenueFoodCouponActive: FoodOwnerCoupon },
    { coupon_id: string; is_active: boolean }
  >(SET_VENUE_FOOD_COUPON_ACTIVE, { coupon_id: couponId, is_active: isActive }, AUTH);
  return data.setVenueFoodCouponActive;
}

export async function deleteFoodCoupon(couponId: string): Promise<void> {
  await graphqlRequest<{ deleteVenueFoodCoupon: boolean }, { coupon_id: string }>(
    DELETE_VENUE_FOOD_COUPON,
    { coupon_id: couponId },
    AUTH,
  );
}
