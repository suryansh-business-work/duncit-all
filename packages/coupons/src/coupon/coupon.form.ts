import { z } from 'zod';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

export interface CouponFormValues {
  code: string;
  description: string;
  discount_pct: number;
  scope: 'GLOBAL' | 'POD';
  pod_id: string;
  valid_from: string;
  valid_until: string;
  max_uses: number | null;
  per_user_limit: number | null;
  min_order_amount: number;
  is_active: boolean;
}

/** Empty string / null -> null, otherwise a positive integer. */
const optionalPositiveInt = z
  .union([z.literal(''), z.null(), z.coerce.number()])
  .transform((value) => (value === '' || value === null ? null : value))
  .refine((value) => value === null || Number.isInteger(value), 'Must be a whole number')
  .refine((value) => value === null || value >= 1, 'Must be at least 1');

export const couponFormSchema: z.ZodType<CouponFormValues, z.ZodTypeDef, unknown> = z
  .object({
    code: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => CODE_PATTERN.test(value), 'Code must be 3-30 chars: A-Z, 0-9, - or _'),
    description: z.string().trim().max(300).default(''),
    discount_pct: z.coerce
      .number({ invalid_type_error: 'Discount must be a number' })
      .min(1, 'Minimum 1%')
      .max(100, 'Maximum 100%'),
    scope: z.enum(['GLOBAL', 'POD']),
    pod_id: z.string().trim().default(''),
    valid_from: z.string().trim().default(''),
    valid_until: z.string().trim().default(''),
    max_uses: optionalPositiveInt,
    per_user_limit: optionalPositiveInt,
    min_order_amount: z.coerce
      .number({ invalid_type_error: 'Must be a number' })
      .min(0, 'Must be 0 or greater')
      .default(0),
    is_active: z.boolean().default(true),
  })
  .superRefine((values, ctx) => {
    if (values.scope === 'POD' && !values.pod_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pod_id'],
        message: 'Pick a pod for a pod-scoped coupon',
      });
    }
  });

export const couponFormDefaults: CouponFormValues = {
  code: '',
  description: '',
  discount_pct: 10,
  scope: 'GLOBAL',
  pod_id: '',
  valid_from: '',
  valid_until: '',
  max_uses: null,
  per_user_limit: null,
  min_order_amount: 0,
  is_active: true,
};

/** Map the form values to the GraphQL CreateCouponInput / UpdateCouponInput. */
export function toCouponInput(values: CouponFormValues) {
  const cast = couponFormSchema.parse(values);
  return {
    code: cast.code,
    description: cast.description || '',
    discount_pct: Number(cast.discount_pct),
    scope: cast.scope,
    pod_id: cast.scope === 'POD' ? cast.pod_id || null : null,
    valid_from: cast.valid_from ? new Date(cast.valid_from).toISOString() : null,
    valid_until: cast.valid_until ? new Date(cast.valid_until).toISOString() : null,
    max_uses: cast.max_uses ?? null,
    per_user_limit: cast.per_user_limit ?? null,
    min_order_amount: Number(cast.min_order_amount) || 0,
    is_active: cast.is_active,
  };
}
