import type { NestedCatalogue } from '../catalogue';

/**
 * Wallet withdrawal copy — a namespace of its own, not a surface's.
 *
 * The withdrawal rules live in `@duncit/forms/schemas` because mWeb, the
 * partner console AND the native app all ask for the same payout details. The
 * sentences they refuse with have to travel with the rules, and they were in
 * three places before: `mweb.wallet.*`, `partners.walletPage.*`, and English
 * literals hard-coded into the app's schema. The partner console's amount rules
 * were hard-coded too — "Max 5000" reached no translator on any surface.
 *
 * `mweb.wallet.*` and `partners.walletPage.*` keep their other entries; only
 * the validation sentences moved here.
 */
export const WITHDRAW_BUNDLE: NestedCatalogue = {
  withdraw: {
    enterAnAmount: 'Enter an amount',
    maxAmount: 'Max {max}',
    minimumAmount: 'Minimum {min}',
    enterYourUpiId: 'Enter your UPI ID',
    enterAccountNumber: 'Enter account number',
    enterIfscCode: 'Enter IFSC code',
  },
};
