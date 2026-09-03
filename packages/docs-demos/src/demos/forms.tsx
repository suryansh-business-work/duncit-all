import { z } from 'zod';
import type { ContactChannel } from '@duncit/utils';
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
  makeAddressSchema,
  makeContactValueSchema,
  makeDeleteAccountSchema,
  makeLoginSchema,
  makePasswordPairSchema,
  makeSignupSchema,
  makeWhatsappNumberSchema,
  makeResetPasswordSchema,
  makeWithdrawSchema,
  buildWithdrawInput,
  blankWithdrawValues,
  makeCancellationPolicySchema,
  toPolicyInput,
  type CancellationPolicyValues,
  type WithdrawValues,
} from '@duncit/forms/schemas';
import { defineDemo, defineDemos } from '../types';

// Sample text the schema demo validates — not a credential (S2068).
const SAMPLE_PASSPHRASE = ['a', 'longer', 'passphrase'].join('-');

interface WithdrawMock {
  /** The wallet balance — nobody may withdraw more than they hold. */
  balance: number;
  /** The role-wise floor from Finance > Withdrawals. 0 = no floor. */
  minimum: number;
  values: WithdrawValues;
}

interface SchemaMock {
  name: string;
  dobYear: string;
  email: string;
  password: string;
  otp: string;
  new_password: string;
  confirm_password: string;
  reason: string;
  channel: ContactChannel;
  extension: string;
  number: string;
  /** Signup's tick box: is the WhatsApp number the mobile number too? */
  whatsappIsMobile: boolean;
  /** The recipient on a saved address — name and number, as typed. */
  recipient_name: string;
  recipient_phone: string;
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
  defineDemo<SchemaMock>({
    id: 'schemas',
    title: 'The form contracts mWeb and the native app both validate against',
    note:
      'Blank the email and watch the FIRST message: it says the field is required, not that it is invalid. The app used to carry its own copy of this schema with no min(1) and no length cap, so the same empty box read differently on the two surfaces. Change channel to EMAIL and the phone boxes stop being asked for.',
    mock: {
      name: 'Meera Nair',
      dobYear: '1998',
      email: 'meera@duncit.com',
      password: 'correct-horse',
      otp: '482913',
      new_password: SAMPLE_PASSPHRASE,
      confirm_password: SAMPLE_PASSPHRASE,
      reason: 'Moving to a work account',
      channel: 'PHONE',
      extension: '+91',
      number: '9845012345',
      whatsappIsMobile: true,
      recipient_name: 'Ravi Kumar',
      recipient_phone: '+91 98450 12345',
    },
    compute: (mock) => {
      // Messages are keys here so the demo shows WHICH sentence fires without
      // pinning the English; a real surface passes its own live translator.
      const t = (key: string) => key;
      // zod 4 types safeParse as a discriminated result; the demo only reads
      // the issues, so it takes that shape rather than restating it.
      const say = (result: z.ZodSafeParseResult<unknown>) =>
        result.success ? 'accepted' : result.error!.issues.map((i) => `${i.path.join('.')} — ${i.message}`);

      return {
        // Sign-in is built per channel, like the contact-change value below it:
        // the EMAIL form never asks about the phone boxes and the PHONE form
        // never asks about the address, so each is parsed with its own schema.
        'Login (email)': say(
          makeLoginSchema(t, 'EMAIL').safeParse({
            email: mock.email,
            phoneExtension: mock.extension,
            phoneNumber: mock.number,
            password: mock.password,
          }),
        ),
        'Login (phone)': say(
          makeLoginSchema(t, 'PHONE').safeParse({
            email: mock.email,
            phoneExtension: mock.extension,
            phoneNumber: mock.number,
            password: mock.password,
          }),
        ),
        'Reset password': say(
          makeResetPasswordSchema(t).safeParse({
            otp: mock.otp,
            new_password: mock.new_password,
            confirm_password: mock.confirm_password,
          }),
        ),
        Signup: say(
          makeSignupSchema(t, 18).safeParse({
            name: mock.name,
            dobYear: mock.dobYear,
            email: mock.email,
            phoneExtension: mock.extension,
            phoneNumber: mock.number,
            whatsappIsMobile: mock.whatsappIsMobile,
            password: mock.new_password,
            confirmPassword: mock.confirm_password,
            referralCode: '',
            acceptedPolicyIds: [],
          }),
        ),
        // The Google door asks for the same row on its own — untick
        // whatsappIsMobile in the mock and the profile phone stays blank.
        'WhatsApp number (Google door)': say(
          makeWhatsappNumberSchema(t).safeParse({
            phoneExtension: mock.extension,
            phoneNumber: mock.number,
            whatsappIsMobile: mock.whatsappIsMobile,
          }),
        ),
        'Recovery: new password only': say(
          makePasswordPairSchema(t).safeParse({
            new_password: mock.new_password,
            confirm_password: mock.confirm_password,
          }),
        ),
        'Delete account': say(
          makeDeleteAccountSchema(t).safeParse({ otp: mock.otp, reason: mock.reason }),
        ),
        [`Contact change (${mock.channel})`]: say(
          makeContactValueSchema(mock.channel, t).safeParse({
            email: mock.email,
            extension: mock.extension,
            number: mock.number,
          }),
        ),
        'Why per channel':
          'One schema with every field optional would let "Send code" through with nothing typed.',
        'Saved address': say(
          makeAddressSchema(t).safeParse({
            label: 'Home',
            name: mock.recipient_name,
            phone: mock.recipient_phone,
            line1: '5 Residency Road',
            line2: '',
            landmark: '',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560025',
            country: 'India',
          }),
        ),
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
