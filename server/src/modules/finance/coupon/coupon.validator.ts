import { z } from 'zod';
import {
  bool,
  filled,
  finite,
  gt,
  gte,
  int,
  lte,
  matches,
  maxLen,
  num,
  obj,
  shape,
  str,
  trim,
  type FieldRules,
} from '@utils/zod-fields';

const codeRegex = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

const SCOPES = ['GLOBAL', 'POD', 'STORE'] as const;
const POD_REQUIRED = 'Pod is required for a pod-scoped coupon';

const toUpperCase = (v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v);
const optionalText = () => str(z.string().nullable(), { transforms: [trim], default: null });
const atLeastOne = () => num(finite().check(int(), gte(1)).nullable(), { typeError: 'Must be a number', default: null });

const code = () => z.string().check(matches(codeRegex, 'Code must be 3-30 chars: A-Z, 0-9, - or _'), filled('Code is required'));
const codeRules: FieldRules = { required: 'Code is required', transforms: [trim, toUpperCase] };
const discount = () => finite().check(gte(1, 'Min 1%'), lte(100, 'Max 100%'));
const discountRules: FieldRules = { typeError: 'Discount must be a number', required: 'Discount is required' };
const scopeRules: FieldRules = { oneOf: SCOPES, required: true };

const couponFields = {
  code: str(code(), codeRules),
  description: str(z.string().check(maxLen(300)), { transforms: [trim], default: '' }),
  discount_pct: num(discount(), discountRules),
  scope: str(z.enum(SCOPES), scopeRules),
  pod_id: optionalText(),
  valid_from: optionalText(),
  valid_until: optionalText(),
  max_uses: atLeastOne(),
  per_user_limit: atLeastOne(),
  min_order_amount: num(finite().check(gte(0)), { typeError: 'Must be a number', default: 0 }),
  is_active: bool(z.boolean(), { default: true }),
};

const couponRules = {
  when: {
    pod_id: (coupon: Record<string, unknown>) =>
      coupon.scope === 'POD'
        ? str(z.string().check(filled(POD_REQUIRED)), { transforms: [trim], required: POD_REQUIRED })
        : undefined,
  },
};

export const createCouponSchema = obj(shape(couponFields, couponRules));

/**
 * The same fields with the required ones made optional. A field that IS sent is
 * still held to the create rules (null and '' included), and the defaults still
 * fill whatever was left out.
 */
export const updateCouponSchema = obj(
  shape(
    {
      ...couponFields,
      code: str(code().optional(), codeRules),
      discount_pct: num(discount().optional(), discountRules),
      scope: str(z.enum(SCOPES).optional(), scopeRules),
    },
    couponRules
  )
);

export const couponPreviewSchema = obj(
  shape({
    code: str(z.string().check(filled('Code is required')), { required: 'Code is required', transforms: [trim] }),
    pod_id: optionalText(),
    amount: num(finite().check(gt(0)), { typeError: 'Amount must be a number', required: true }),
  })
);

export type CreateCouponDTO = z.infer<typeof createCouponSchema>;
