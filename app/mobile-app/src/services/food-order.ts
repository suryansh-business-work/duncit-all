import { parse } from 'graphql';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  PREVIEW_VENUE_FOOD_COUPON_QUERY,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  foodCouponRejectionOf,
  foodOrderErrorCode,
  type PlaceVenueFoodOrderInput,
  type PreviewVenueFoodCouponInput,
  type VenueFoodCouponPreview,
  type VenueFoodCouponRejection,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

import type { RazorpaySignature } from '@/hooks/useCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

/**
 * The food order's round trips — the order's three, and the coupon preview. The documents come from @duncit/utils as
 * strings — the same ones mWeb sends — and are parsed once here, exactly as
 * components/public-page/publicPageRequests.ts does, so they need no native
 * codegen. The calls carry the session, so the order is also the member's own.
 */
const PLACE_VENUE_FOOD_ORDER = parse(PLACE_VENUE_FOOD_ORDER_MUTATION);
const VERIFY_VENUE_FOOD_ORDER = parse(VERIFY_VENUE_FOOD_ORDER_MUTATION);
const VENUE_FOOD_ORDER = parse(VENUE_FOOD_ORDER_QUERY);
const PREVIEW_VENUE_FOOD_COUPON = parse(PREVIEW_VENUE_FOOD_COUPON_QUERY);

export async function placeFoodOrder(
  input: PlaceVenueFoodOrderInput,
): Promise<VenueFoodOrderPlacement | null> {
  const data = await graphqlRequest<
    { placeVenueFoodOrder: VenueFoodOrderPlacement | null },
    { input: PlaceVenueFoodOrderInput }
  >(PLACE_VENUE_FOOD_ORDER, { input }, { auth: true });
  return data.placeVenueFoodOrder ?? null;
}

interface VerifyInput extends RazorpaySignature {
  order_id: string;
  access_key: string;
}

export async function verifyFoodOrderPayment(input: VerifyInput): Promise<void> {
  await graphqlRequest<{ verifyVenueFoodOrderPayment: { id: string } }, { input: VerifyInput }>(
    VERIFY_VENUE_FOOD_ORDER,
    { input },
    { auth: true },
  );
}

export async function fetchFoodOrder(
  orderId: string,
  accessKey: string | null,
): Promise<VenueFoodOrder | null> {
  const data = await graphqlRequest<
    { venueFoodOrder: VenueFoodOrder | null },
    { orderId: string; accessKey: string | null }
  >(VENUE_FOOD_ORDER, { orderId, accessKey }, { auth: true });
  return data.venueFoodOrder ?? null;
}

/** What a venue's coupon code does to a cart. Changes nothing; a refused code comes back in the answer. */
export async function previewFoodCoupon(
  input: PreviewVenueFoodCouponInput,
): Promise<VenueFoodCouponPreview> {
  const data = await graphqlRequest<
    { previewVenueFoodCoupon: VenueFoodCouponPreview },
    { input: PreviewVenueFoodCouponInput }
  >(PREVIEW_VENUE_FOOD_COUPON, { input }, { auth: true });
  return data.previewVenueFoodCoupon;
}

/**
 * Native's client throws an ApiError carrying the GraphQL extensions, which
 * the shared helpers read off an `errors` list — so the error is handed over
 * in that shape and the reading stays in one place (@duncit/utils).
 */
const shaped = (err: unknown): unknown =>
  err instanceof ApiError ? { errors: [{ extensions: err.extensions }] } : err;

/** The `extensions.code` of a failed food-order call. */
export function foodOrderNativeErrorCode(err: unknown): string {
  return foodOrderErrorCode(shaped(err));
}

/** Why a placement was refused over its coupon; null for any other failure. */
export function foodCouponNativeRejection(err: unknown): VenueFoodCouponRejection | null {
  return foodCouponRejectionOf(shaped(err));
}
