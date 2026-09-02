import { makeSignupSchema, type SignupFormValues } from '@duncit/forms/schemas';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS } from '@duncit/datetime';
import { fallbackT, type Translate } from '../../i18n/fallback';

/**
 * mWeb's signup contract — the shared one, under the names this surface's call
 * sites already use.
 *
 * The rules themselves live in `@duncit/forms/schemas` because the native app
 * validates the same signup: the two copies had drifted on the name length, the
 * confirm-password rule and whether a blank email said "required" or "invalid"
 * (rule 40). Nothing here re-states a rule; it only binds the factory to mWeb's
 * bundled English so a caller outside React still reads real sentences.
 */
export function makeRegisterSchema(
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  t: Translate = fallbackT,
  requiredPolicyIds: readonly string[] = [],
) {
  return makeSignupSchema(minAge, t, requiredPolicyIds);
}

export const registerSchema = makeRegisterSchema();

export type RegisterFormValues = SignupFormValues;

export { signupDefaults as registerDefaults } from '@duncit/forms/schemas';
