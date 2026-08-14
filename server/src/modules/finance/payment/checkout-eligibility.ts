import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';

/**
 * What an account must have before it can pay for anything.
 *
 * A payment creates a booking, an invoice and a payout somebody has to be able
 * to chase. That needs a number to call, an address that stands up on the bill,
 * and an email address the receipt will actually reach — a receipt sent to an
 * unverified address is a receipt sent nowhere, and it is the only proof of
 * purchase the buyer gets.
 *
 * The phone is required to EXIST, not to be verified: the number is captured at
 * signup and the platform does not currently make anyone re-prove it, so
 * demanding a verified one here would lock out accounts with no way to comply.
 *
 * This is checked on the server rather than in the pay button, because mWeb,
 * the app and the API are three doors onto the same six mutations.
 */

/** Each thing that can be missing, so a client can send the buyer to fix it. */
export type CheckoutRequirement = 'PHONE' | 'EMAIL_VERIFIED' | 'BILLING_ADDRESS';

const MESSAGES: Record<CheckoutRequirement, string> = {
  PHONE: 'Add a phone number to your profile before checking out.',
  EMAIL_VERIFIED: 'Verify your email address before checking out.',
  BILLING_ADDRESS: 'Add your billing address before checking out.',
};

/**
 * The requirements this account does not yet meet, in the order to fix them.
 * Every branch of the shape is optional AND nullable because that is what the
 * user document really is — an account that never filled any of this in has
 * `phone` and `address` missing outright, not empty.
 */
export function missingCheckoutRequirements(user: {
  auth?: {
    email?: string | null;
    is_email_verified?: boolean | null;
    phone?: { number?: string | null } | null;
  } | null;
  address?: { line1?: string | null } | null;
}): CheckoutRequirement[] {
  const missing: CheckoutRequirement[] = [];
  if (!user.auth?.phone?.number?.trim()) missing.push('PHONE');
  if (!user.auth?.is_email_verified) missing.push('EMAIL_VERIFIED');
  if (!user.address?.line1?.trim()) missing.push('BILLING_ADDRESS');
  return missing;
}

/**
 * Refuse the payment when the account is not ready, naming every missing piece
 * at once. Reporting them one at a time would send a buyer round the profile
 * three times to buy one ticket.
 */
export async function assertCheckoutEligible(userId: string): Promise<void> {
  const user = await UserModel.findById(userId).select(
    'auth.email auth.is_email_verified auth.phone.number address.line1'
  );
  if (!user) {
    throw new GraphQLError('Account not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const missing = missingCheckoutRequirements(user);
  if (missing.length === 0) return;
  throw new GraphQLError(missing.map((key) => MESSAGES[key]).join(' '), {
    extensions: { code: 'CHECKOUT_NOT_ELIGIBLE', missing },
  });
}
