import { makeForgotPasswordSchema } from '@duncit/forms/schemas';

import { fallbackT } from '@/i18n/fallback';

export {
  forgotPasswordDefaults,
  makeForgotPasswordSchema,
  type ForgotPasswordValues,
} from '@duncit/forms/schemas';

export const forgotPasswordSchema = makeForgotPasswordSchema(fallbackT);
