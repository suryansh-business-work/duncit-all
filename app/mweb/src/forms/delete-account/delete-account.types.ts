import { makeDeleteAccountSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

export {
  deleteAccountDefaults,
  makeDeleteAccountSchema,
  type DeleteAccountValues,
} from '@duncit/forms/schemas';

export const deleteAccountSchema = makeDeleteAccountSchema(fallbackT);
