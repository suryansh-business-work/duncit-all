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
    // The wallet's "Download statement" dialog. Here, not under a surface's own
    // namespace, for the same reason as the rules above: the partner console,
    // mWeb and the native app render the same form from the same presets.
    statement: {
      title: 'Download statement',
      intro: 'Every earning, withdrawal and reversal in the period, with your opening and closing balance.',
      periodLabel: 'Period',
      presetThisMonth: 'This month',
      presetLastMonth: 'Last month',
      presetLast3Months: 'Last 3 months',
      presetLast6Months: 'Last 6 months',
      presetThisFinancialYear: 'This financial year',
      presetLastFinancialYear: 'Last financial year',
      presetCustom: 'Custom range',
      fromLabel: 'From',
      toLabel: 'To',
      rangeSummary: '{from} to {to}',
      formatLabel: 'Format',
      download: 'Download',
      downloading: 'Preparing statement…',
      downloaded: 'Your statement is ready.',
      emptyPeriod: 'No transactions in this period. Your statement shows the opening and closing balance only.',
      failed: 'We could not prepare your statement. Please try again.',
      retry: 'Try again',
      sharingUnavailable: 'Sharing is not available on this device.',
      errorMissing: 'Choose both dates',
      errorInvalid: 'Enter a valid date',
      errorOrder: 'The end date must be on or after the start date',
      errorFuture: 'A statement cannot include future dates',
      errorTooLong: 'A statement can cover at most {days} days',
    },
  },
};
