import {
  CouponFacts,
  buildCouponFormSchema,
  couponFormDefaults,
  getRedemptionColumns,
  toCouponInput,
  type CouponRow,
  type CouponStats,
} from '@duncit/coupons';
import { defineDemo, defineDemos } from '../types';

/** A coupon exactly as the dialog holds it before Save. */
type CouponMock = typeof couponFormDefaults;

/** A saved coupon beside what the payments that spent it add up to. */
interface DetailMock {
  coupon: CouponRow;
  stats: CouponStats;
}

// The detail page reads dates through the admin-configured clock; the demo has
// no LocaleProvider above it, so it passes a plain formatter of its own.
const demoDateTime = (value: Date | string) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

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

  defineDemo<DetailMock>({
    id: 'detail-facts',
    title: 'What a coupon has actually done',
    note:
      "The facts panel from CouponDetailPage. Drop max_uses to 40 and the Redeemed tile fills its bar and says 0 left; null it and the bar disappears for 'No usage cap'. used_count is the coupon's own counter, while the money and the members are aggregated over the payments that spent the code.",
    mock: {
      coupon: {
        id: '66f1c4d2a7b9e10442c81e07',
        code: 'WKNDCOFFEE100',
        description: 'Sip it Make it Dun-cit — weekend coffee pods',
        discount_pct: 100,
        scope: 'POD',
        pod_id: '66e0b2115c3d9a0011ab4471',
        pod: { id: '66e0b2115c3d9a0011ab4471', pod_title: 'Sip it Make it Dun-cit' },
        valid_from: '2026-08-30T00:00:00.000Z',
        valid_until: '2026-09-06T18:29:59.000Z',
        max_uses: 20,
        per_user_limit: 1,
        min_order_amount: 199,
        used_count: 12,
        is_active: true,
        created_at: '2026-08-28T09:14:22.000Z',
        updated_at: '2026-09-02T11:41:08.000Z',
      },
      stats: {
        used_count: 12,
        unique_users: 11,
        total_discount: 4788,
        order_value: 0,
        remaining_uses: 8,
        last_redeemed_at: '2026-09-05T16:22:41.000Z',
        currency_symbol: '₹',
      },
    },
    render: (mock) => (
      <CouponFacts coupon={mock.coupon} stats={mock.stats} formatDateTime={demoDateTime} />
    ),
    compute: (mock) => ({
      'Redemption columns': getRedemptionColumns((key) => key, mock.stats.currency_symbol).map(
        (column) => column.field
      ),
    }),
  }),
]);
