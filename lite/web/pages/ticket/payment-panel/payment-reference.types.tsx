import { z } from 'zod';
import { rules, type Translate } from '../../../lib/validation';

/** The UPI transaction reference (UTR) the guest copied from their payment app. */
export const makePaymentReferenceSchema = (t: Translate) =>
  z.object({
    reference: z
      .string()
      .trim()
      .min(6, t('liteWeb.validation.referenceLength'))
      .max(40, t('liteWeb.validation.referenceLength')),
    note: rules.optional(t, 200),
  });

export type PaymentReferenceValues = z.infer<ReturnType<typeof makePaymentReferenceSchema>>;
