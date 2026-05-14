import * as yup from 'yup';
import {
  AADHAR_PATTERN,
  GSTIN_PATTERN,
  PAN_PATTERN,
  PHONE_EXTENSION_PATTERN,
  PHONE_NUMBER_PATTERN,
  validationRules,
} from '../../../forms/validation/rules';
import { bankAccountSchema } from '../../../forms/validation/bankAccount';
import type { DocEntry, Step1, Step3 } from '../queries';

const POSTAL_CODE_PATTERN = /^[0-9A-Za-z -]{3,12}$/;

const ownerPhonePattern = /^\+?\d{6,15}$/;

export const venueStep1Schema: yup.ObjectSchema<Step1> = yup.object({
  venue_name: yup
    .string()
    .trim()
    .min(2, 'Venue name must be at least 2 characters')
    .max(120, 'Venue name must be 120 characters or fewer')
    .required('Venue name is required'),
  venue_type: yup.string().trim().required('Venue type is required'),
  capacity: yup
    .number()
    .typeError('Capacity must be a number')
    .integer('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(100_000, 'Capacity is unrealistic')
    .required('Capacity is required'),
  description: yup.string().trim().max(2000, 'Description must be 2000 characters or fewer').default(''),
  cover_image_url: yup.string().trim().max(1000).default(''),
  gallery: yup.array(yup.string().trim().max(1000).required()).default([]),
  address_line1: yup
    .string()
    .trim()
    .min(3, 'Address line 1 must be at least 3 characters')
    .max(200, 'Address line 1 must be 200 characters or fewer')
    .required('Address line 1 is required'),
  address_line2: yup.string().trim().max(200).default(''),
  location_id: yup.string().trim().required('Select a city from locations'),
  country: yup.string().trim().required('Country is required'),
  country_code: yup
    .string()
    .trim()
    .max(3, 'Country code must be 3 characters or fewer')
    .required('Country code is required'),
  city: yup.string().trim().required('City is required'),
  state: yup.string().trim().required('State is required'),
  state_code: yup.string().trim().max(10).default(''),
  locality: yup.string().trim().required('Locality is required'),
  postal_code: yup
    .string()
    .trim()
    .matches(POSTAL_CODE_PATTERN, 'Enter a valid postal/ZIP code (3–12 alphanumerics)')
    .required('Postal code is required'),
  tags: yup.array(yup.string().trim().max(40).required()).default([]),
});

export const venueStep2Schema = yup.object({
  documents: yup
    .array()
    .of(
      yup.object({
        type: yup.string().trim().required('Document type is required'),
        url: yup.string().trim().required('Document URL is required'),
      }),
    )
    .default([])
    .test('valid-docs', 'Each document must have both a type and a URL', (docs) =>
      (docs ?? []).every((doc) => !!doc.type && !!doc.url),
    ),
  gstin: yup
    .string()
    .trim()
    .uppercase()
    .max(30)
    .default('')
    .test('gstin', 'GSTIN must follow format like 22ABCDE1234F1Z5', (value) => {
      if (!value) return true;
      return GSTIN_PATTERN.test(value);
    }),
  pan: yup
    .string()
    .trim()
    .uppercase()
    .max(20)
    .default('')
    .test('pan', 'PAN must follow format ABCDE1234F', (value) => {
      if (!value) return true;
      return PAN_PATTERN.test(value);
    }),
});

export const venueStep3Schema: yup.ObjectSchema<Step3> = yup.object({
  owner_name: validationRules.personName('Owner name'),
  owner_email: validationRules.email('Owner email'),
  owner_phone: yup
    .string()
    .trim()
    .matches(ownerPhonePattern, 'Owner phone must contain only digits (6–15 digits) with optional + prefix')
    .required('Owner phone is required'),
  owner_dob: yup
    .string()
    .default('')
    .test('valid-dob', 'Enter a valid date of birth', (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }),
  owner_address: yup
    .string()
    .trim()
    .max(500, 'Address must be 500 characters or fewer')
    .default(''),
  bank_account: bankAccountSchema,
});

export const venueCreateSchema = yup.object({
  owner_user_id: yup.string().trim().required('Select an owner user'),
  step1: venueStep1Schema,
  step2: venueStep2Schema,
  step3: venueStep3Schema,
});

export const venueEditSchema = yup.object({
  step1: venueStep1Schema,
  step2: venueStep2Schema,
  step3: venueStep3Schema,
  status: yup.string().trim().required('Status is required'),
});

export interface VenueStep2Values {
  documents: DocEntry[];
  gstin: string;
  pan: string;
}

export function validateVenueCreate(input: {
  owner_user_id: string;
  step1: Step1;
  step2: VenueStep2Values;
  step3: Step3;
}) {
  return venueCreateSchema.validate(input, { abortEarly: false });
}

export function validateVenueEdit(input: {
  step1: Step1;
  step2: VenueStep2Values;
  step3: Step3;
  status: string;
}) {
  return venueEditSchema.validate(input, { abortEarly: false });
}

export type VenueValidationErrors = Record<string, string>;

export function collectVenueValidationErrors(error: unknown): VenueValidationErrors {
  if (!(error instanceof yup.ValidationError)) return {};
  const errors: VenueValidationErrors = {};
  const items = error.inner.length ? error.inner : [error];
  for (const item of items) {
    if (item.path && !errors[item.path]) errors[item.path] = item.message;
  }
  return errors;
}

export function getVenueError(errors: VenueValidationErrors | undefined, path: string) {
  if (!errors) return '';
  return errors[path] ?? '';
}

// Used by AADHAR-needing flows if reused — re-exported for completeness.
export { AADHAR_PATTERN, PAN_PATTERN, GSTIN_PATTERN, PHONE_NUMBER_PATTERN, PHONE_EXTENSION_PATTERN };
