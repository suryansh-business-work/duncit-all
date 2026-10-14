import { gql } from '@apollo/client';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  PREVIEW_VENUE_FOOD_COUPON_QUERY,
  SUBMIT_VENUE_FOOD_FEEDBACK_MUTATION,
  VENUE_FOOD_FEEDBACK_UPLOAD_PASS_MUTATION,
  VENUE_FOOD_ORDER_INVOICE_QUERY,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  type PreviewVenueFoodCouponInput,
  type SubmitVenueFoodFeedbackInput,
  type VenueFoodCouponPreview,
  type VenueFoodFeedback,
  type VenueFoodUploadPass,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

// The documents live in @duncit/utils so the native app sends the same ones.
export const PLACE_VENUE_FOOD_ORDER = gql(PLACE_VENUE_FOOD_ORDER_MUTATION);
export const VERIFY_VENUE_FOOD_ORDER = gql(VERIFY_VENUE_FOOD_ORDER_MUTATION);
export const VENUE_FOOD_ORDER = gql(VENUE_FOOD_ORDER_QUERY);
export const PREVIEW_VENUE_FOOD_COUPON = gql(PREVIEW_VENUE_FOOD_COUPON_QUERY);
export const VENUE_FOOD_ORDER_INVOICE = gql(VENUE_FOOD_ORDER_INVOICE_QUERY);
export const VENUE_FOOD_FEEDBACK_UPLOAD_PASS = gql(VENUE_FOOD_FEEDBACK_UPLOAD_PASS_MUTATION);
export const SUBMIT_VENUE_FOOD_FEEDBACK = gql(SUBMIT_VENUE_FOOD_FEEDBACK_MUTATION);

export interface PlaceVenueFoodOrderData {
  placeVenueFoodOrder: VenueFoodOrderPlacement;
}

export interface VenueFoodOrderData {
  venueFoodOrder: VenueFoodOrder | null;
}

export interface PreviewVenueFoodCouponData {
  previewVenueFoodCoupon: VenueFoodCouponPreview;
}

/** The order's id and the key that proves it is the caller's. */
export interface FoodOrderAccessVars {
  orderId: string;
  accessKey: string | null;
}

export interface VenueFoodOrderInvoiceData {
  venueFoodOrderInvoicePdfBase64: string;
}

export interface VenueFoodFeedbackUploadPassData {
  venueFoodFeedbackUploadPass: VenueFoodUploadPass;
}

export interface SubmitVenueFoodFeedbackData {
  submitVenueFoodFeedback: { id: string; status: string; feedback: VenueFoodFeedback | null };
}

export interface SubmitVenueFoodFeedbackVars {
  input: SubmitVenueFoodFeedbackInput;
}

export interface PreviewVenueFoodCouponVars {
  input: PreviewVenueFoodCouponInput;
}
