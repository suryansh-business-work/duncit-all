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

export const accountEditSchema = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: optionalPersonName('Last name'),
  bio: validationRules.optionalText('Bio', 500),
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
  return accountEditSchema.cast(values, { stripUnknown: true });
}
