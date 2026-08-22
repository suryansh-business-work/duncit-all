import { buildCouponFormSchema, couponFormDefaults, toCouponInput } from '@duncit/coupons';
import { defineDemo, defineDemos } from '../types';

/** A coupon exactly as the dialog holds it before Save. */
type CouponMock = typeof couponFormDefaults;

export default defineDemos('coupons', [
  defineDemo<CouponMock>({
    id: 'validate',
    title: 'What the coupon dialog will and will not accept',
    note:
      "Lower-case the code and it comes back upper-cased — the schema transforms rather than rejects. Set discount_pct to 120, or scope to 'POD' with an empty pod_id, and it refuses.",
    mock: {
      ...couponFormDefaults,
      code: 'MONSOON25',
      description: '25% off any pod through September',
      discount_pct: 25,
      scope: 'GLOBAL',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      max_uses: 500,
      per_user_limit: 1,
      min_order_amount: 300,
      is_active: true,
    },
    compute: (mock) => {
      // The messages come from the catalogue, so the schema takes a
      // translator — the live one inside a console, the key itself here.
      const parsed = buildCouponFormSchema((key) => key).safeParse(mock);
      if (!parsed.success) {
        return {
          Valid: false,
          Errors: parsed.error.issues.map(
            (issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`
          ),
        };
      }
      return {
        Valid: true,
        'Parsed values': parsed.data,
        'What the server receives': toCouponInput(mock),
      };
    },
  }),
]);
