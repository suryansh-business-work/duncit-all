import { z } from 'zod';

import { emailRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makePasswordSignInSchema = (t: Translate) =>
  z.object({
    email: emailRule(t),
    // Not trimmed: a password is exactly what was typed.
    password: z
      .string()
      .min(1, t('ecommStore.validation.passwordRequired'))
      .max(128, t('ecommStore.validation.tooLong')),
  });

export type PasswordSignInValues = z.infer<ReturnType<typeof makePasswordSignInSchema>>;
