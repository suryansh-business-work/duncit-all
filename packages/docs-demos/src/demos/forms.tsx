import { z } from 'zod';
import {
  AADHAR_PATTERN,
  GSTIN_PATTERN,
  PAN_PATTERN,
  PERSON_NAME_PATTERN,
  PHONE_NUMBER_PATTERN,
  PUBLIC_URL_PATTERN,
  SLUG_KEY_PATTERN,
  zodRules,
} from '@duncit/forms';
import {
  makeWithdrawSchema,
  buildWithdrawInput,
  blankWithdrawValues,
  makeCancellationPolicySchema,
  toPolicyInput,
  type CancellationPolicyValues,
  type WithdrawValues,
} from '@duncit/forms/schemas';
import { defineDemo, defineDemos } from '../types';
// The rendered packaging section and the long schema demo live beside this file.
import { PackagingDemo, type PackagingMock } from './forms/PackagingDemo';
import { schemasDemo } from './forms/schemas-demo';

interface WithdrawMock {
  /** The wallet balance — nobody may withdraw more than they hold. */
  balance: number;
  /** The role-wise floor from Finance > Withdrawals. 0 = no floor. */
  minimum: number;
  values: WithdrawValues;
}

interface FieldMock {
  full_name: string;
  email: string;
  phone_number: string;
  pan: string;
  aadhar: string;
  gstin: string;
  slug: string;
}

/** Built from the shared rules — never from a hand-written zod chain per form. */
const profileSchema = z.object({
  full_name: zodRules.personName('Full name'),
  email: zodRules.email(),
  phone_number: zodRules.requiredText('Phone number', 6, 15),
});

export default defineDemos('forms', [
  defineDemo<PackagingMock>({
    id: 'packaging',
    title: 'Shipping & packaging — the section every product form shares',
    note:
      'A 10 kg food bag packed 60 × 40 × 15 cm bills at its own weight. Press "Bed / large" and the box (70 × 50 × 20) out-weighs the bed: the readout jumps to 14 kg and the warning appears. Every value stays editable. Set required to true and every measurement label gains its asterisk, as the parcel edit before a booking shows it.',
    mock: { weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15, hsn_code: '2309', required: false },
    render: (mock) => <PackagingDemo mock={mock} />,
  }),
  defineDemo<FieldMock>({
    id: 'rules',
    title: 'One set of field rules, every form on the platform',
    note:
      'Break full_name with a digit, or trim the phone to four digits — the same message appears wherever that field is asked for, because the rule is imported rather than retyped.',
    mock: {
      full_name: 'Meera Nair',
      email: 'meera@duncit.com',
      phone_number: '9845012345',
      pan: 'ABCDE1234F',
      aadhar: '123412341234',
      gstin: '29AABCU9603R1ZM',
      slug: 'pod-shop-banner',
    },
    compute: (mock) => {
      const parsed = profileSchema.safeParse(mock);
      return {
        'Profile fields valid': parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map((issue) => `${issue.path.join('.')} — ${issue.message}`),
        'PERSON_NAME_PATTERN': PERSON_NAME_PATTERN.test(mock.full_name),
        'PHONE_NUMBER_PATTERN': PHONE_NUMBER_PATTERN.test(mock.phone_number),
        'PUBLIC_URL_PATTERN (a WhatsApp header asset)': PUBLIC_URL_PATTERN.test(
          'https://ik.imagekit.io/duncit/whatsapp/pod-header.jpg'
        ),
        'PAN_PATTERN': PAN_PATTERN.test(mock.pan),
        'AADHAR_PATTERN': AADHAR_PATTERN.test(mock.aadhar),
        'GSTIN_PATTERN': GSTIN_PATTERN.test(mock.gstin),
        'SLUG_KEY_PATTERN': SLUG_KEY_PATTERN.test(mock.slug),
      };
    },
  }),
  schemasDemo,

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
