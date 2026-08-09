import { z } from 'zod';
import { fallbackT, type Translate } from '../../i18n/fallback';

/**
 * Login contract — RHF + Zod (migrated from Formik + Yup). Mirrors the server
 * login validation and the mobile app's `loginSchema`: email + 8-char password.
 *
 * The messages are copy, so they come from the shared catalogue (rule 38). The
 * form passes its live `t`; the export below resolves against the bundled
 * English for callers that parse the schema outside React.
 */
export function makeLoginSchema(t: Translate = fallbackT) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(254),
    password: z.string().min(8, t('mweb.auth.validation.passwordMin')),
  });
}

export const loginSchema = makeLoginSchema();

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginDefaults: LoginFormValues = { email: '', password: '' };
