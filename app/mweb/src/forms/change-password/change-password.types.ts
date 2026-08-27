import { makeCurrentPasswordSchema, makeNewPasswordSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

export {
  currentPasswordDefaults,
  makeCurrentPasswordSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from '@duncit/forms/schemas';

export const currentPasswordSchema = makeCurrentPasswordSchema(fallbackT);
export const newPasswordSchema = makeNewPasswordSchema(fallbackT);
