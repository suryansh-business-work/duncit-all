import { z } from 'zod';

import { requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makeGiftCardSchema = (t: Translate) =>
  z.object({ code: requiredRule(t, 'ecommStore.giftCard.required', 40) });

export type GiftCardValues = z.infer<ReturnType<typeof makeGiftCardSchema>>;
