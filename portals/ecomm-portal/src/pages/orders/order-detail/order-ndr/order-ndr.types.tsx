import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';

/** Mirrors `storeAnswerNdr(action, comments)`: ShipRocket keeps 300 characters of comment. */
export const makeOrderNdrSchema = (t: Translate) =>
  z.object({
    action: z.enum(['REATTEMPT', 'RETURN']),
    comments: makeRules(t).optionalText(300),
  });

export type OrderNdrValues = z.infer<ReturnType<typeof makeOrderNdrSchema>>;

export const ORDER_NDR_DEFAULTS: OrderNdrValues = { action: 'REATTEMPT', comments: '' };
