import * as yup from 'yup';

const codeRegex = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

export const createCouponSchema = yup.object({
  code: yup
    .string()
    .trim()
    .transform((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .matches(codeRegex, 'Code must be 3-30 chars: A-Z, 0-9, - or _')
    .required('Code is required'),
  description: yup.string().trim().max(300).default(''),
  discount_pct: yup
    .number()
    .typeError('Discount must be a number')
    .min(1, 'Min 1%')
    .max(100, 'Max 100%')
    .required('Discount is required'),
  scope: yup.string().oneOf(['GLOBAL', 'POD']).required(),
  pod_id: yup
    .string()
    .trim()
    .nullable()
    .when('scope', {
      is: 'POD',
      then: (s) => s.required('Pod is required for a pod-scoped coupon'),
      otherwise: (s) => s.nullable().default(null),
    }),
  valid_from: yup.string().trim().nullable().default(null),
  valid_until: yup.string().trim().nullable().default(null),
  max_uses: yup.number().typeError('Must be a number').integer().min(1).nullable().default(null),
  per_user_limit: yup.number().typeError('Must be a number').integer().min(1).nullable().default(null),
  min_order_amount: yup.number().typeError('Must be a number').min(0).default(0),
  is_active: yup.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();

export const couponPreviewSchema = yup.object({
  code: yup.string().trim().required('Code is required'),
  pod_id: yup.string().trim().nullable().default(null),
  amount: yup.number().typeError('Amount must be a number').moreThan(0).required(),
});

export type CreateCouponDTO = yup.InferType<typeof createCouponSchema>;
