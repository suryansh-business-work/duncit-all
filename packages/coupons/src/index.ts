// Discount codes, one implementation for the two consoles that touch them.
//
// The Marketing portal owns the subject — a coupon is a promotion — and renders
// the whole `CouponsPage`. Admin still manages the offer codes of a single pod
// from that pod's detail page, and that section is the SAME table and the SAME
// dialog: two copies would be two answers to "what does this code do" (rule 40).
export { default as CouponsPage } from './CouponsPage';
export { default as CouponsTable } from './CouponsTable';
export { default as CouponFormDialog } from './CouponFormDialog';

export {
  COUPON_FIELDS,
  COUPON_PODS,
  COUPONS,
  COUPONS_FOR_POD,
  COUPONS_FOR_POD_TABLE,
  COUPONS_TABLE,
  CREATE_COUPON,
  DELETE_COUPON,
  UPDATE_COUPON,
} from './queries';
export type { CouponPodOption, CouponRow } from './queries';

export { buildCouponFormSchema, couponFormDefaults, toCouponInput } from './coupon';
export type { CouponFormValues, CouponTranslate } from './coupon';
