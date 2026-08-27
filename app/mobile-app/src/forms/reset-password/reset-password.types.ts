import { makeResetPasswordSchema, type ResetPasswordValues } from '@duncit/forms/schemas';

import { fallbackT } from '@/i18n/fallback';

export {
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ResetPasswordValues,
} from '@duncit/forms/schemas';

/** The app named this shape `ResetPasswordFormValues`; keep the alias so its
 * screens do not all have to be touched to share the rules. */
export type ResetPasswordFormValues = ResetPasswordValues;

export const resetPasswordSchema = makeResetPasswordSchema(fallbackT);
