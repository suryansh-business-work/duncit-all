import { parse } from 'graphql';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  PREVIEW_VENUE_FOOD_COUPON_QUERY,
  SUBMIT_VENUE_FOOD_FEEDBACK_MUTATION,
  VENUE_FOOD_FEEDBACK_UPLOAD_PASS_MUTATION,
  VENUE_FOOD_ORDER_INVOICE_QUERY,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  foodCouponRejectionOf,
  foodOrderErrorCode,
  type PlaceVenueFoodOrderInput,
  type PreviewVenueFoodCouponInput,
  type SubmitVenueFoodFeedbackInput,
  type VenueFoodCouponPreview,
  type VenueFoodCouponRejection,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
  type VenueFoodUploadPass,
} from '@duncit/utils';

import type { RazorpaySignature } from '@/hooks/useCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

/**
 * The food order's round trips — the order's three, the coupon preview, and what
 * follows a paid order: its invoice and its rating. The documents come from @duncit/utils as
 * strings — the same ones mWeb sends — and are parsed once here, exactly as
 * components/public-page/publicPageRequests.ts does, so they need no native
 * codegen. The calls carry the session, so the order is also the member's own.
 */
const PLACE_VENUE_FOOD_ORDER = parse(PLACE_VENUE_FOOD_ORDER_MUTATION);
const VERIFY_VENUE_FOOD_ORDER = parse(VERIFY_VENUE_FOOD_ORDER_MUTATION);
const VENUE_FOOD_ORDER = parse(VENUE_FOOD_ORDER_QUERY);
const PREVIEW_VENUE_FOOD_COUPON = parse(PREVIEW_VENUE_FOOD_COUPON_QUERY);
const VENUE_FOOD_ORDER_INVOICE = parse(VENUE_FOOD_ORDER_INVOICE_QUERY);
const VENUE_FOOD_FEEDBACK_UPLOAD_PASS = parse(VENUE_FOOD_FEEDBACK_UPLOAD_PASS_MUTATION);
const SUBMIT_VENUE_FOOD_FEEDBACK = parse(SUBMIT_VENUE_FOOD_FEEDBACK_MUTATION);

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

interface OrderKeyVars {
  orderId: string;
  accessKey: string | null;
}

/** A paid order's invoice as a base64 PDF, for whoever holds the order's access key. */
export async function fetchFoodInvoiceBase64(
  orderId: string,
  accessKey: string | null,
): Promise<string> {
  const data = await graphqlRequest<{ venueFoodOrderInvoicePdfBase64: string }, OrderKeyVars>(
    VENUE_FOOD_ORDER_INVOICE,
    { orderId, accessKey },
    { auth: true },
  );
  return data.venueFoodOrderInvoicePdfBase64;
}

/** A single-use pass to upload ONE feedback photo — a guest may be signed out, so the order vouches. */
export async function requestFoodFeedbackUploadPass(
  orderId: string,
  accessKey: string | null,
): Promise<VenueFoodUploadPass> {
  const data = await graphqlRequest<
    { venueFoodFeedbackUploadPass: VenueFoodUploadPass },
    OrderKeyVars
  >(VENUE_FOOD_FEEDBACK_UPLOAD_PASS, { orderId, accessKey }, { auth: true });
  return data.venueFoodFeedbackUploadPass;
}

/** Rate a served order — once; a second rating is refused with CONFLICT. */
export async function submitFoodFeedback(input: SubmitVenueFoodFeedbackInput): Promise<void> {
  await graphqlRequest<
    { submitVenueFoodFeedback: { id: string } },
    { input: SubmitVenueFoodFeedbackInput }
  >(SUBMIT_VENUE_FOOD_FEEDBACK, { input }, { auth: true });
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
