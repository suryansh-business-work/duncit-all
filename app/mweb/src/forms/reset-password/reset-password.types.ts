import { makeResetPasswordSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

export {
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ResetPasswordValues,
} from '@duncit/forms/schemas';

export const resetPasswordSchema = makeResetPasswordSchema(fallbackT);
