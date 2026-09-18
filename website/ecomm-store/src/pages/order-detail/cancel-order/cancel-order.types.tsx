import { z } from 'zod';

import { requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makeCancelOrderSchema = (t: Translate) =>
  z.object({ reason: requiredRule(t, 'ecommStore.cancel.reasonRequired', 200) });

export type CancelOrderValues = z.infer<ReturnType<typeof makeCancelOrderSchema>>;
