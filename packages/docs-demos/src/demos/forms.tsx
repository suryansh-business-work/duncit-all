import { z } from 'zod';
import {
  makeWithdrawSchema,
  buildWithdrawInput,
  blankWithdrawValues,
  makeCancellationPolicySchema,
  makeFoodGstinRule,
  makeFoodTaxDefaultsSchema,
  makeVenueFoodTaxRefinement,
  venueFoodTaxShape,
  toPolicyInput,
  type CancellationPolicyValues,
  type FoodTaxDefaultsValues,
  type VenueFoodTaxValues,
  type WithdrawValues,
} from '@duncit/forms/schemas';
import { defineDemo, defineDemos } from '../types';
// The rendered sections, the field rules and the long schema demo live beside this file.
import { PackagingDemo, type PackagingMock } from './forms/PackagingDemo';
import { rulesDemo } from './forms/rules-demo';
import { schemasDemo } from './forms/schemas-demo';
import { venueOfferAskDemo } from './forms/VenueOfferAskDemo';
import { freeArrangementDemo } from './forms/FreeArrangementDemo';
import { WalletStatementDemo, type WalletStatementMock } from './forms/WalletStatementDemo';

interface FoodTaxMock {
  /** Finance's default, as its form holds it. */
  defaults: FoodTaxDefaultsValues;
  /** One venue's own GST beside its food ordering. */
  venue: VenueFoodTaxValues;
  gstin: string;
}

interface WithdrawMock {
  /** The wallet balance — nobody may withdraw more than they hold. */
  balance: number;
  /** The role-wise floor from Finance > Withdrawals. 0 = no floor. */
  minimum: number;
  values: WithdrawValues;
}

export default defineDemos('forms', [
  defineDemo<PackagingMock>({
    id: 'packaging',
    title: 'Shipping & packaging — the section every product form shares',
    note:
      'A 10 kg food bag packed 60 × 40 × 15 cm bills at its own weight. Press "Bed / large" and the box (70 × 50 × 20) out-weighs the bed: the readout jumps to 14 kg and the warning appears. Every value stays editable. Set required to true and every measurement label gains its asterisk, as the parcel edit before a booking shows it.',
    mock: { weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15, hsn_code: '2309', required: false },
    render: (mock) => <PackagingDemo mock={mock} />,
  }),
  defineDemo<WalletStatementMock>({
    id: 'wallet-statement',
    title: 'Download statement — one dialog for mWeb and the partner console',
    note:
      'Open it and press Download: a preset needs no checking, so the stand-in server answers at once. Set answer to EMPTY for the nil-statement note, or FAILURE for the error with Retry. Choose Custom range and submit it blank to see the same refusals the server enforces. Set partnerConsole to true for the console\'s look: the two days side by side, the heavier title and a spinner on Download. "Today" is fixed at 11 October 2026, Kolkata.',
    mock: { answer: 'FILE', partnerConsole: false },
    render: (mock) => <WalletStatementDemo mock={mock} />,
  }),
  rulesDemo,
  schemasDemo,
  venueOfferAskDemo,
  freeArrangementDemo,

  defineDemo<FoodTaxMock>({
    id: 'food-tax',
    title: 'GST on venue food — the rules Finance, the owner and the Venues console share',
    note:
      'Set gst_pct to 29 or 2.5 and the default is refused. Turn the venue override off and its stored mode stops being checked — what sits behind a switched-off override never blocks a save.',
    mock: {
      defaults: { tax_mode: 'INCLUSIVE', gst_pct: '5' },
      venue: { tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: '18' },
      gstin: '22ABCDE1234F1Z5',
    },
    compute: (mock) => {
      const t = (key: string) => key;
      const defaults = makeFoodTaxDefaultsSchema(t).safeParse(mock.defaults);
      const checkTax = makeVenueFoodTaxRefinement(t);
      const venue = z
        .object({ food_ordering: z.object(venueFoodTaxShape) })
        .superRefine((values, ctx) => checkTax(values.food_ordering, ctx, ['food_ordering']))
        .safeParse({ food_ordering: mock.venue });
      const issues = (result: { success: boolean; error?: z.ZodError }) =>
        result.success ? 'accepted' : (result.error?.issues ?? []).map((i) => `${i.path.join('.')} — ${i.message}`);
      return {
        'Finance default': defaults.success ? defaults.data : issues(defaults),
        'Venue override': issues(venue),
        GSTIN: issues(makeFoodGstinRule(t).safeParse(mock.gstin)),
      };
    },
  }),

  defineDemo<WithdrawMock>({
    id: 'withdraw',
    title: 'The wallet withdrawal rules all three wallets validate',
    note:
      'Set minimum to 500 and amount to 100 while the balance stays at 10000 — the request is refused for being under the floor, not for exceeding the balance. That is the rule the server enforces twice and the client used to check once. Switch payout_method to IMPS and the UPI id stops being asked for.',
    mock: {
      balance: 10000,
      minimum: 500,
      values: {
        ...blankWithdrawValues,
        amount: '2500',
        payout_method: 'UPI',
        upi_id: 'meera@okhdfcbank',
      },
    },
    compute: (mock) => {
      const t = (key: string) => key;
      const result = makeWithdrawSchema(mock.balance, mock.minimum, t).safeParse(mock.values);
      return {
        Verdict: result.success
          ? 'accepted'
          : result.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`),
        'Sent to requestWithdrawal': result.success ? buildWithdrawInput(mock.values) : null,
        'Why the floor is checked here':
          'The server enforces balance >= min AND amount >= min. Checking only the balance let a healthy wallet submit an under-floor amount and meet a raw server error instead of a field message.',
      };
    },
  }),

  defineDemo<CancellationPolicyValues>({
    id: 'venue-cancellation',
    title: 'The cancellation policy a venue owner writes, as every surface checks it',
    note:
      'The third band is refused twice: 6 hours is already covered by the flat ₹500 band, and 120% would charge more than the booking. Change its hours_before to 2 and its value to 80 and the whole policy parses — the numbers the mutation receives appear below, coerced from the strings the inputs hold. Tick reschedule_only and the bands are still sent: that switch makes them inapplicable, not wrong.',
    mock: {
      reschedule_only: false,
      tiers: [
        { hours_before: '24', charge_type: 'PERCENT', value: '50' },
        { hours_before: '6', charge_type: 'AMOUNT', value: '500' },
        { hours_before: '6', charge_type: 'PERCENT', value: '120' },
      ],
    },
    compute: (mock) => {
      const t = (key: string) => key;
      const result = makeCancellationPolicySchema(t).safeParse(mock);
      return {
        Verdict: result.success
          ? 'accepted'
          : result.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`),
        'Sent as VenueSettingsInput.cancellation': result.success ? toPolicyInput(mock, t) : null,
        'Cancelling outside every band': 'free — a band charges only INSIDE its window',
      };
    },
  }),
]);
