import { z } from 'zod';

/** The translator a schema reads its messages from (rule 38). */
export type CouponTranslate = (key: string) => string;

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
const optionalPositiveInt = (t: CouponTranslate) =>
  z
    .union([z.literal(''), z.null(), z.coerce.number()])
    .transform((value) => (value === '' || value === null ? null : value))
    .refine((value) => value === null || Number.isInteger(value), t('shell.coupons.wholeNumber'))
    .refine((value) => value === null || value >= 1, t('shell.coupons.atLeastOne'));

/**
 * Built from the console's translator rather than exported ready-made: a
 * validation message is copy the admin reads, so it follows their language like
 * every other string on the screen (rule 38).
 */
export const buildCouponFormSchema = (
  t: CouponTranslate,
) =>
  z
    .object({
      code: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => CODE_PATTERN.test(value), t('shell.coupons.codeInvalid')),
      description: z.string().trim().max(300).default(''),
      discount_pct: z.coerce
        .number({ error: t('shell.coupons.discountNumber') })
        .min(1, t('shell.coupons.discountMin'))
        .max(100, t('shell.coupons.discountMax')),
      scope: z.enum(['GLOBAL', 'POD']),
      pod_id: z.string().trim().default(''),
      valid_from: z.string().trim().default(''),
      valid_until: z.string().trim().default(''),
      max_uses: optionalPositiveInt(t),
      per_user_limit: optionalPositiveInt(t),
      min_order_amount: z.coerce
        .number({ error: t('shell.coupons.amountNumber') })
        .min(0, t('shell.coupons.amountMin'))
        .default(0),
      is_active: z.boolean().default(true),
    })
    .superRefine((values, ctx) => {
      if (values.scope === 'POD' && !values.pod_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pod_id'],
          message: t('shell.coupons.podRequired'),
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

/**
 * Map the form values to the GraphQL CreateCouponInput / UpdateCouponInput.
 *
 * Runs the schema again for its coercions and defaults, never for its messages
 * — the form has already blocked anything invalid — so the key itself is a fine
 * stand-in for a translator here.
 */
export function toCouponInput(values: CouponFormValues) {
  const cast = buildCouponFormSchema((key) => key).parse(values);
  return {
    code: cast.code,
    description: cast.description || '',
    discount_pct: Number(cast.discount_pct),
    scope: cast.scope,
    pod_id: cast.scope === 'POD' ? cast.pod_id : null,
    valid_from: cast.valid_from ? new Date(cast.valid_from).toISOString() : null,
    valid_until: cast.valid_until ? new Date(cast.valid_until).toISOString() : null,
    max_uses: cast.max_uses ?? null,
    per_user_limit: cast.per_user_limit ?? null,
    min_order_amount: Number(cast.min_order_amount) || 0,
    is_active: cast.is_active,
  };
}
