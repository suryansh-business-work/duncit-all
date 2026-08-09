import { z } from 'zod';

import { fallbackT, type Translate } from '@/i18n/fallback';

/**
 * Login contract — identical to mWeb: email + password, same server. The
 * messages are copy, so they come from the shared catalogue (rule 38): the form
 * passes its live `t`, and the export below resolves against bundled English.
 */
export function makeLoginSchema(t: Translate = fallbackT) {
  return z.object({
    email: z.string().trim().email(t('mweb.auth.validation.emailInvalid')),
    password: z.string().min(8, t('mweb.auth.validation.passwordMin')),
  });
}

export const loginSchema = makeLoginSchema();

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginDefaults: LoginFormValues = {
  email: '',
  password: '',
};
