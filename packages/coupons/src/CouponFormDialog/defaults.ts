import { couponFormDefaults, type CouponFormValues } from '../coupon';
import type { CouponPodOption, CouponRow } from '../queries';

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

/** The form as it opens: the coupon being edited, or a blank one pinned to its pod. */
export const buildDefaults = (
  initial?: CouponRow | null,
  lockedPod?: CouponPodOption | null,
): CouponFormValues =>
  initial
    ? {
        code: initial.code,
        description: initial.description,
        discount_pct: initial.discount_pct,
        scope: initial.scope,
        pod_id: initial.pod_id ?? '',
        valid_from: toDateInput(initial.valid_from),
        valid_until: toDateInput(initial.valid_until),
        max_uses: initial.max_uses,
        per_user_limit: initial.per_user_limit,
        min_order_amount: initial.min_order_amount,
        is_active: initial.is_active,
      }
    : { ...couponFormDefaults, ...(lockedPod ? { scope: 'POD', pod_id: lockedPod.id } : {}) };
