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
  makeContactValueSchema,
  makeDeleteAccountSchema,
  makeLoginSchema,
  makePasswordPairSchema,
  makeResetPasswordSchema,
  makeWithdrawSchema,
  buildWithdrawInput,
  blankWithdrawValues,
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
  email: string;
  password: string;
  otp: string;
  new_password: string;
  confirm_password: string;
  reason: string;
  channel: ContactChannel;
  extension: string;
  number: string;
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
      email: 'meera@duncit.com',
      password: 'correct-horse',
      otp: '482913',
      new_password: SAMPLE_PASSPHRASE,
      confirm_password: SAMPLE_PASSPHRASE,
      reason: 'Moving to a work account',
      channel: 'PHONE',
      extension: '+91',
      number: '9845012345',
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
        Login: say(makeLoginSchema(t).safeParse({ email: mock.email, password: mock.password })),
        'Reset password': say(
          makeResetPasswordSchema(t).safeParse({
            otp: mock.otp,
            new_password: mock.new_password,
            confirm_password: mock.confirm_password,
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
]);
