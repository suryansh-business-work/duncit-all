import * as yup from 'yup';
import { PERSON_NAME_PATTERN, validationRules } from '../../../forms/validation/rules';

const optionalPersonName = (label: string) =>
  yup
    .string()
    .trim()
    .max(60, `${label} must be 60 characters or fewer`)
    .test('person-name', `${label} can use letters, spaces, apostrophes, periods and hyphens only`, (value) => {
      if (!value) return true;
      return PERSON_NAME_PATTERN.test(value);
    })
    .default('');

const optionalLocation = (label: string) =>
  yup.string().trim().max(80, `${label} must be 80 characters or fewer`).default('');

const optionalDob = yup
  .string()
  .trim()
  .matches(/^$|^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .test('past-date', 'Enter a valid past date', (value) => {
    if (!value) return true;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  })
  .default('');

export const accountEditSchema = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: optionalPersonName('Last name'),
  bio: validationRules.optionalText('Bio', 500),
  dob: optionalDob,
  city: optionalLocation('City'),
  zone: optionalLocation('Zone'),
  country: optionalLocation('Country'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone number'),
  whatsapp_extension: yup.string().trim().when('whatsapp_number', {
    is: (value: string) => !!value,
    then: (schema) => schema.matches(/^\+?\d{1,5}$/, 'WhatsApp code is invalid').required('WhatsApp code is required'),
    otherwise: (schema) => schema.default(''),
  }),
  whatsapp_number: yup
    .string()
    .trim()
    .matches(/^$|^\d{6,15}$/, 'WhatsApp number must contain only digits (6-15 digits)')
    .default(''),
});

export type AccountEditValues = yup.InferType<typeof accountEditSchema>;

export function accountEditInitialValues(initial: Partial<AccountEditValues>): AccountEditValues {
  return {
    first_name: '',
    last_name: '',
    bio: '',
    dob: '',
    city: '',
    zone: '',
    country: '',
    phone_extension: '+91',
    phone_number: '',
    whatsapp_extension: '+91',
    whatsapp_number: '',
    ...initial,
  } as AccountEditValues;
}

export function toUpdateProfileInput(values: AccountEditValues) {
  const input = accountEditSchema.cast(values, { stripUnknown: true });
  // Omit an empty dob so saving the form doesn't wipe an existing birth date.
  if (!input.dob) delete (input as { dob?: string }).dob;
  return input;
}

/** ISO/date string → the YYYY-MM-DD value the DatePicker is initialised with. */
export function toDobInput(value?: string | null): string {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)) ? value.slice(0, 10) : '';
}
