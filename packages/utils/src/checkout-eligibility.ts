/**
 * What an account must have before it can pay for anything.
 *
 * A payment creates a booking, an invoice and a receipt somebody has to be able
 * to chase: a number to call, an address that stands up on the bill, and an
 * email the receipt will actually reach. The server refuses a payment that is
 * missing any of them, so this exists to say the SAME thing before the buyer
 * fills in a card and gets refused at the end.
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
export type CheckoutRequirement = 'PHONE' | 'EMAIL_VERIFIED' | 'BILLING_ADDRESS';

/** The account facts this rule reads — whatever shape the caller's `me` has. */
export interface CheckoutEligibilityInput {
  phoneNumber?: string | null;
  isEmailVerified?: boolean | null;
  /** First line of the saved main address; the rest may legitimately be blank. */
  addressLine1?: string | null;
}

/** The localization key describing each unmet requirement. */
export const CHECKOUT_REQUIREMENT_KEYS: Record<CheckoutRequirement, string> = {
  PHONE: 'mweb.checkout.needPhone',
  EMAIL_VERIFIED: 'mweb.checkout.needEmailVerified',
  BILLING_ADDRESS: 'mweb.checkout.needBillingAddress',
};

/** What this account still has to do before it can pay. Empty means ready. */
export function missingCheckoutRequirements(
  input: CheckoutEligibilityInput
): CheckoutRequirement[] {
  const missing: CheckoutRequirement[] = [];
  if (!input.phoneNumber?.trim()) missing.push('PHONE');
  if (!input.isEmailVerified) missing.push('EMAIL_VERIFIED');
  if (!input.addressLine1?.trim()) missing.push('BILLING_ADDRESS');
  return missing;
}
