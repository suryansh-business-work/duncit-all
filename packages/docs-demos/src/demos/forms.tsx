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
import { defineDemo, defineDemos } from '../types';

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
]);
