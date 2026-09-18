import { z } from 'zod';

import { emailRule, phoneRule, requiredRule } from '../../../lib/validation';

type Translate = (key: string) => string;

/** Who is buying: the order's name, email and 10-digit mobile. */
export const makeContactSchema = (t: Translate) =>
  z.object({
    name: requiredRule(t, 'ecommStore.validation.nameRequired', 120),
    email: emailRule(t),
    phone: phoneRule(t),
  });

export type ContactValues = z.infer<ReturnType<typeof makeContactSchema>>;
