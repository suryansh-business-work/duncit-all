import { makeSignupSchema as makeSharedSignupSchema, type SignupFormValues } from '@duncit/forms/schemas';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS } from '@duncit/datetime';

import { fallbackT, type Translate } from '@/i18n/fallback';

/**
 * The app's signup contract — the shared one, bound to this surface's bundled
 * English.
 *
 * The rules live in `@duncit/forms/schemas` because mWeb validates the same
 * signup: the two copies had drifted on the name length, the confirm-password
 * rule and whether a blank email said "required" or "invalid" (rule 40).
 */
export function makeSignupSchema(
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  t: Translate = fallbackT,
  requiredPolicyIds: readonly string[] = [],
) {
  return makeSharedSignupSchema(minAge, t, requiredPolicyIds);
}

export const signupSchema = makeSignupSchema();

export type { SignupFormValues };

export { signupDefaults } from '@duncit/forms/schemas';
