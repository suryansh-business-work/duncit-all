import { parse } from 'graphql';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  foodOrderErrorCode,
  type PlaceVenueFoodOrderInput,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

import type { RazorpaySignature } from '@/hooks/useCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

/**
 * The food order's three round trips. The documents come from @duncit/utils as
 * strings — the same ones mWeb sends — and are parsed once here, exactly as
 * components/public-page/publicPageRequests.ts does, so they need no native
 * codegen. The calls carry the session, so the order is also the member's own.
 */
const PLACE_VENUE_FOOD_ORDER = parse(PLACE_VENUE_FOOD_ORDER_MUTATION);
const VERIFY_VENUE_FOOD_ORDER = parse(VERIFY_VENUE_FOOD_ORDER_MUTATION);
const VENUE_FOOD_ORDER = parse(VENUE_FOOD_ORDER_QUERY);

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

/**
 * The `extensions.code` of a failed food-order call. Native's client throws an
 * ApiError carrying the GraphQL extensions, which the shared helper reads off
 * an `errors` list — so the code is handed over in that shape and the reading
 * stays in one place (@duncit/utils).
 */
export function foodOrderNativeErrorCode(err: unknown): string {
  const shaped = err instanceof ApiError ? { errors: [{ extensions: err.extensions }] } : err;
  return foodOrderErrorCode(shaped);
}
