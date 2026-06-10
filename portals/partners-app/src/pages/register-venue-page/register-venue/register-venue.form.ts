import * as yup from 'yup';
import { POSTAL_CODE_PATTERN, validationRules } from '../../../forms/validation/rules';
import type { VenueStep1, VenueStep2, VenueStep3 } from '../types';

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const OWNER_PHONE_PATTERN = /^\+?\d{6,15}$/;

export const venueStep1Schema: yup.ObjectSchema<VenueStep1> = yup.object({
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
  description: yup.string().trim().max(2000).default(''),
  location_id: yup.string().trim().required('Select a city from available locations'),
  country: yup.string().trim().required('Country is required'),
  country_code: yup
    .string()
    .trim()
    .max(3, 'Country code must be 3 characters or fewer')
    .required('Country code is required'),
  state: yup.string().trim().required('State is required'),
  state_code: yup.string().trim().max(10).default(''),
  city: yup.string().trim().required('City is required'),
  locality: yup.string().trim().required('Locality / area is required'),
  postal_code: yup
    .string()
    .trim()
    .matches(POSTAL_CODE_PATTERN, 'Enter a valid PIN code (3–12 alphanumerics)')
    .required('PIN code is required'),
  address_line1: yup
    .string()
    .trim()
    .min(3, 'Address line 1 must be at least 3 characters')
    .max(200, 'Address line 1 must be 200 characters or fewer')
    .required('Address line 1 is required'),
  address_line2: yup.string().trim().max(200).default(''),
  cover_image_url: yup.string().trim().max(1000).default(''),
  gallery: yup.array(yup.string().trim().max(1000).required()).default([]),
});

export const venueStep2Schema: yup.ObjectSchema<VenueStep2> = yup.object({
  documents: yup
    .array()
    .of(
      yup.object({
        type: yup.string().trim().required('Document type is required'),
        url: yup.string().trim().required('Document URL is required'),
      }),
    )
    .default([])
    .test('has-doc', 'Upload at least one document', (docs) =>
      (docs ?? []).some((doc) => doc.type && doc.url),
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

export const venueStep3Schema: yup.ObjectSchema<VenueStep3> = yup.object({
  owner_name: validationRules.personName('Owner name'),
  owner_email: validationRules.email('Owner email'),
  owner_phone: yup
    .string()
    .trim()
    .matches(OWNER_PHONE_PATTERN, 'Owner phone must contain only digits (6–15 digits) with optional + prefix')
    .required('Owner phone is required'),
  owner_dob: yup
    .string()
    .default('')
    .test('valid-dob', 'Enter a valid date of birth', (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }),
  owner_address: yup.string().trim().max(500, 'Address must be 500 characters or fewer').default(''),
});

export async function validateStep(
  step: number,
  step1: VenueStep1,
  step2: VenueStep2,
  step3: VenueStep3,
): Promise<string | null> {
  try {
    if (step === 0) await venueStep1Schema.validate(step1, { abortEarly: false });
    if (step === 1) await venueStep2Schema.validate(step2, { abortEarly: false });
    if (step === 2) await venueStep3Schema.validate(step3, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) return error.errors[0] ?? 'Check required fields';
    return 'Check required fields';
  }
}

export function validateAllSteps(step1: VenueStep1, step2: VenueStep2, step3: VenueStep3) {
  return yup
    .object({ step1: venueStep1Schema, step2: venueStep2Schema, step3: venueStep3Schema })
    .validate({ step1, step2, step3 }, { abortEarly: false });
}

export function getStepErrors<T extends object>(
  schema: yup.ObjectSchema<any>,
  values: T,
): Partial<Record<keyof T, string>> {
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) return {};
    const errors: Partial<Record<keyof T, string>> = {};
    for (const inner of error.inner) {
      if (inner.path && !(inner.path in errors)) {
        (errors as any)[inner.path] = inner.message;
      }
    }
    return errors;
  }
}
