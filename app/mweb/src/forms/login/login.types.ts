import { makeLoginSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

export { loginDefaults, makeLoginSchema, type LoginFormValues } from '@duncit/forms/schemas';

/** The rules bound to mWeb's bundled English, for callers outside React. */
export const loginSchema = makeLoginSchema(fallbackT);
