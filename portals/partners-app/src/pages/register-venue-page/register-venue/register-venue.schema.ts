import { z } from 'zod';
import { POSTAL_CODE_PATTERN, zodRules } from '../../../forms/validation/rules';
import type { RegisterVenueValues, VenueSectionKey } from './register-venue.types';

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const OWNER_PHONE_PATTERN = /^\+?\d{6,15}$/;

const capacityItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Give this capacity a label (e.g. Banquet hall)')
    .max(80, 'Capacity label must be 80 characters or fewer'),
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(100_000, 'Capacity is unrealistic'),
});

const documentSchema = z.object({
  type: z.string().trim().min(1, 'Document type is required'),
  url: z.string().trim().min(1, 'Upload the document file'),
});

const optionalPattern = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || pattern.test(value.toUpperCase()), message);

export const registerVenueSchema = z.object({
  venue_name: zodRules.requiredText('Venue name', 2, 120),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer'),
  cover_image_url: z.string().trim().max(1000),
  gallery: z.array(z.string().trim().max(1000)),
  super_category_id: z.string().trim().min(1, 'Select a super category'),
  category_id: z.string().trim().min(1, 'Select a category'),
  sub_category_id: z.string().trim().min(1, 'Select a sub category'),
  address_line1: zodRules.requiredText('Address line 1', 3, 200),
  address_line2: z.string().trim().max(200),
  location_id: z.string().trim().min(1, 'Select a city from available locations'),
  country: z.string().trim().min(1, 'Country is required'),
  country_code: z.string().trim().max(3, 'Country code must be 3 characters or fewer'),
  state: z.string().trim().min(1, 'State is required'),
  state_code: z.string().trim().max(10),
  city: z.string().trim().min(1, 'City is required'),
  locality: z.string().trim().min(1, 'Locality / area is required'),
  postal_code: z
    .string()
    .trim()
    .regex(POSTAL_CODE_PATTERN, 'Enter a valid PIN code (3–12 alphanumerics)'),
  venue_type: z.string().trim().min(1, 'Select a venue type'),
  capacity_items: z
    .array(capacityItemSchema)
    .min(1, 'Add at least one capacity entry for your venue'),
  documents: z.array(documentSchema).min(1, 'Upload at least one document'),
  gstin: optionalPattern(GSTIN_PATTERN, 'GSTIN must follow format like 22ABCDE1234F1Z5'),
  pan: optionalPattern(PAN_PATTERN, 'PAN must follow format ABCDE1234F'),
  owner_name: zodRules.personName('Owner name'),
  owner_email: zodRules.email('Owner email'),
  owner_phone: z
    .string()
    .trim()
    .regex(OWNER_PHONE_PATTERN, 'Owner phone must contain only digits (6–15 digits) with optional + prefix'),
  owner_dob: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'Enter a valid date of birth'),
  owner_address: z.string().trim().max(500, 'Address must be 500 characters or fewer'),
});

/** Fields validated (and shown as incomplete in the rail) per section. */
export const SECTION_FIELDS: Record<Exclude<VenueSectionKey, 'review'>, (keyof RegisterVenueValues)[]> = {
  details: [
    'venue_name',
    'description',
    'cover_image_url',
    'gallery',
    'super_category_id',
    'category_id',
    'sub_category_id',
    'address_line1',
    'address_line2',
    'location_id',
    'country',
    'country_code',
    'state',
    'state_code',
    'city',
    'locality',
    'postal_code',
  ],
  'type-capacity': ['venue_type', 'capacity_items'],
  documents: ['documents', 'gstin', 'pan'],
  owner: ['owner_name', 'owner_email', 'owner_phone', 'owner_dob', 'owner_address'],
};
