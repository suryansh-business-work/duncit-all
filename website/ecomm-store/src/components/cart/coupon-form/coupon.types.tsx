import { z } from 'zod';

type Translate = (key: string) => string;

export const makeCouponSchema = (t: Translate) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t('ecommStore.coupon.required'))
      .max(40, t('ecommStore.coupon.tooLong'))
      .regex(/^[\w-]+$/, t('ecommStore.coupon.invalid')),
  });

export type CouponValues = z.infer<ReturnType<typeof makeCouponSchema>>;
