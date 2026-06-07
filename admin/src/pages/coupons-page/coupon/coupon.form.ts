import * as yup from 'yup';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

const optionalDate = yup.string().trim().default('');
const optionalPositiveInt = yup
  .number()
  .transform((value, original) => (original === '' || original === null ? null : value))
  .nullable()
  .integer('Must be a whole number')
  .min(1, 'Must be at least 1')
  .default(null);

export const couponFormSchema = yup.object({
  code: yup
    .string()
    .trim()
    .transform((value) => (typeof value === 'string' ? value.toUpperCase() : value))
    .matches(CODE_PATTERN, 'Code must be 3-30 chars: A-Z, 0-9, - or _')
    .required('Code is required'),
  description: yup.string().trim().max(300).default(''),
  discount_pct: yup
    .number()
    .typeError('Discount must be a number')
    .min(1, 'Minimum 1%')
    .max(100, 'Maximum 100%')
    .required('Discount is required'),
  scope: yup.string().oneOf(['GLOBAL', 'POD']).required('Scope is required'),
  pod_id: yup
    .string()
    .trim()
    .default('')
    .when('scope', {
      is: 'POD',
      then: (schema) => schema.required('Pick a pod for a pod-scoped coupon'),
      otherwise: (schema) => schema.default(''),
    }),
  valid_from: optionalDate,
  valid_until: optionalDate,
  max_uses: optionalPositiveInt,
  per_user_limit: optionalPositiveInt,
  min_order_amount: yup
    .number()
    .typeError('Must be a number')
    .min(0, 'Must be 0 or greater')
    .default(0),
  is_active: yup.boolean().default(true),
});

export type CouponFormValues = yup.InferType<typeof couponFormSchema>;

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
  const cast = couponFormSchema.cast(values, { stripUnknown: true });
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
