import { makeLoginSchema, type LoginChannel, type LoginFormValues } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

export {
  loginDefaults,
  makeLoginSchema,
  LOGIN_CHANNELS,
  type LoginChannel,
  type LoginFormValues,
} from '@duncit/forms/schemas';

/**
 * What the form hands its caller: the boxes, plus which of them was being
 * filled in. The channel is not a form value — it remounts the form rather than
 * being validated by it — so it is added on the way out.
 */
export type LoginSubmitValues = LoginFormValues & { channel: LoginChannel };

/** The rules bound to mWeb's bundled English, for callers outside React. */
export const loginSchema = makeLoginSchema(fallbackT);
