import { z } from 'zod';
import { EMAIL, PHONE_NUMBER, toDigits } from '@duncit/regex';

import { requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

/** An order number, and the email or 10-digit phone it was placed with. */
export const makeTrackOrderSchema = (t: Translate) =>
  z.object({
    orderNo: requiredRule(t, 'ecommStore.track.orderRequired', 40),
    contact: z
      .string()
      .trim()
      .refine((value) => EMAIL.test(value) || PHONE_NUMBER.test(toDigits(value).slice(-10)), t('ecommStore.track.contactInvalid')),
  });

export type TrackOrderValues = z.infer<ReturnType<typeof makeTrackOrderSchema>>;
