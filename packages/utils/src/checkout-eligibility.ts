/**
 * What an account must have before it can pay for anything.
 *
 * A payment creates a booking, an invoice and a receipt somebody has to be able
 * to chase: a number to call and an email the receipt will actually reach.
 * Billing is mandatory in the checkout form itself because it may differ from
 * the saved main address.
 *
 * The phone must EXIST, not be verified — the number is captured at signup and
 * nobody is asked to re-prove it, so demanding a verified one would lock out
 * accounts with no way to comply.
 *
 * mWeb and the native app share this because rule 27 makes them one screen in
 * two frameworks. The server keeps its own copy on purpose: `server/src`
 * imports no `@duncit/*` package, so its gate is written where it is enforced.
 */

/** Each thing that can be missing, in the order it should be fixed. */
export type CheckoutRequirement = 'PHONE' | 'EMAIL_VERIFIED';

/** The account facts this rule reads — whatever shape the caller's `me` has. */
export interface CheckoutEligibilityInput {
  phoneNumber?: string | null;
  isEmailVerified?: boolean | null;
}

/** The localization key describing each unmet requirement. */
export const CHECKOUT_REQUIREMENT_KEYS: Record<CheckoutRequirement, string> = {
  PHONE: 'mweb.checkout.needPhone',
  EMAIL_VERIFIED: 'mweb.checkout.needEmailVerified',
};

/** What this account still has to do before it can pay. Empty means ready. */
export function missingCheckoutRequirements(
  input: CheckoutEligibilityInput
): CheckoutRequirement[] {
  const missing: CheckoutRequirement[] = [];
  if (!input.phoneNumber?.trim()) missing.push('PHONE');
  if (!input.isEmailVerified) missing.push('EMAIL_VERIFIED');
  return missing;
}
