import { z } from 'zod';
import {
  GSTIN_PATTERN,
  PAN_PATTERN,
  validationRules,
} from '../../../forms/validation/rules';
import { bankAccountSchema } from '../../../forms/validation/bankAccount';
import type { DocEntry, Step1, Step3 } from '../queries';

const POSTAL_CODE_PATTERN = /^[0-9A-Za-z -]{3,12}$/;

const ownerPhonePattern = /^\+?\d{6,15}$/;

/** A missing value and a blank one are refused with the same message. */
const requiredString = (message: string) => z.string({ error: message }).trim().min(1, message);

const listItem = z.string().trim().min(1);
const categoryText = z.string().trim().default('');

export const venueStep1Schema: z.ZodType<Step1> = z.object({
  venue_name: validationRules.requiredText('Venue name', 2, 120),
  venue_type: requiredString('Venue type is required'),
  capacity: z
    .number({ error: (issue) => (issue.input == null ? 'Capacity is required' : 'Capacity must be a number') })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(100_000, 'Capacity is unrealistic'),
  description: validationRules.optionalText('Description', 2000),
  amenities: z.array(listItem).default([]),
  facilities: z.array(listItem).default([]),
  security: z.array(listItem).default([]),
  cover_image_url: z.string().trim().max(1000).default(''),
  gallery: z.array(listItem.max(1000)).default([]),
  address_line1: validationRules.requiredText('Address line 1', 3, 200),
  address_line2: z.string().trim().max(200).default(''),
  location_id: requiredString('Select a city from locations'),
  country: requiredString('Country is required'),
  country_code: requiredString('Country code is required').max(3, 'Country code must be 3 characters or fewer'),
  city: requiredString('City is required'),
  state: requiredString('State is required'),
  state_code: z.string().trim().max(10).default(''),
  locality: requiredString('Locality is required'),
  postal_code: z
    .string({ error: 'Postal code is required' })
    .trim()
    .regex(POSTAL_CODE_PATTERN, 'Enter a valid postal/ZIP code (3–12 alphanumerics)'),
  // Optional Super → Category → Sub selection (validated server-side when set).
  venue_category: z
    .object({
      super_category_id: categoryText,
      super_category_name: categoryText,
      category_id: categoryText,
      category_name: categoryText,
      sub_category_id: categoryText,
      sub_category_name: categoryText,
    })
    .prefault({}),
  tags: z.array(listItem.max(40)).default([]),
});

export const venueStep2Schema = z.object({
  documents: z
    .array(
      z.object({
        type: requiredString('Document type is required'),
        url: requiredString('Document URL is required'),
      }),
    )
    .default([])
    .refine((docs) => docs.every((doc) => !!doc.type && !!doc.url), 'Each document must have both a type and a URL'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .max(30)
    .refine((value) => !value || GSTIN_PATTERN.test(value), 'GSTIN must follow format like 22ABCDE1234F1Z5')
    .default(''),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .max(20)
    .refine((value) => !value || PAN_PATTERN.test(value), 'PAN must follow format ABCDE1234F')
    .default(''),
});

export const venueStep3Schema: z.ZodType<Step3> = z.object({
  owner_name: validationRules.personName('Owner name'),
  owner_email: validationRules.email('Owner email'),
  owner_phone: z
    .string({ error: 'Owner phone is required' })
    .trim()
    .regex(ownerPhonePattern, 'Owner phone must contain only digits (6–15 digits) with optional + prefix'),
  owner_dob: z
    .string()
    .default('')
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'Enter a valid date of birth'),
  owner_address: validationRules.optionalText('Address', 500),
  bank_account: bankAccountSchema,
});

export const venueCreateSchema = z.object({
  owner_user_id: requiredString('Select an owner user'),
  step1: venueStep1Schema,
  step2: venueStep2Schema,
  step3: venueStep3Schema,
});

export const venueEditSchema = z.object({
  step1: venueStep1Schema,
  step2: venueStep2Schema,
  step3: venueStep3Schema,
  status: requiredString('Status is required'),
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
  return venueCreateSchema.parseAsync(input);
}

export function validateVenueEdit(input: {
  step1: Step1;
  step2: VenueStep2Values;
  step3: Step3;
  status: string;
}) {
  return venueEditSchema.parseAsync(input);
}

export type VenueValidationErrors = Record<string, string>;

/** `step2.documents[0].url` — the spelling the venue sections look a field's error up by. */
const issuePath = (path: PropertyKey[]) =>
  path.reduce<string>((joined, key) => {
    if (typeof key === 'number') return `${joined}[${key}]`;
    return joined ? `${joined}.${String(key)}` : String(key);
  }, '');

export function collectVenueValidationErrors(error: unknown): VenueValidationErrors {
  if (!(error instanceof z.ZodError)) return {};
  const errors: VenueValidationErrors = {};
  for (const issue of error.issues) {
    const path = issuePath(issue.path);
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return errors;
}

export function getVenueError(errors: VenueValidationErrors | undefined, path: string) {
  if (!errors) return '';
  return errors[path] ?? '';
}

// Used by AADHAR-needing flows if reused — re-exported for completeness.
export { PAN_PATTERN, GSTIN_PATTERN };
export {
  AADHAR_PATTERN,
  PHONE_NUMBER_PATTERN,
  PHONE_EXTENSION_PATTERN,
} from '../../../forms/validation/rules';
