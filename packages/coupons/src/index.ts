// Discount codes, one implementation for the two consoles that touch them.
//
// The Marketing portal owns the subject — a coupon is a promotion — and renders
// the whole `CouponsPage`. Admin still manages the offer codes of a single pod
// from that pod's detail page, and that section is the SAME table and the SAME
// dialog: two copies would be two answers to "what does this code do" (rule 40).
export { default as CouponsPage } from './CouponsPage';
export { default as CouponsTable } from './CouponsTable';
export { default as CouponFormDialog } from './CouponFormDialog';
export { default as CouponDetailPage } from './detail/CouponDetailPage';
// The detail page's facts panel on its own: the only piece of it that mounts
// without Apollo and a router, which is what the docs demo mounts.
export { default as CouponFacts } from './detail/CouponFacts';
export { getRedemptionColumns } from './detail/redemptionColumns';

export {
  COUPON,
  COUPON_FIELDS,
  COUPON_PODS,
  COUPON_REDEMPTIONS_TABLE,
  COUPON_STATS,
  COUPONS,
  COUPONS_FOR_POD,
  COUPONS_FOR_POD_TABLE,
  COUPONS_TABLE,
  CREATE_COUPON,
  DELETE_COUPON,
  UPDATE_COUPON,
} from './queries';
export type { CouponPodOption, CouponRedemptionRow, CouponRow, CouponStats } from './queries';

export { buildCouponFormSchema, couponFormDefaults, toCouponInput } from './coupon';
export type { CouponFormValues, CouponTranslate } from './coupon';
