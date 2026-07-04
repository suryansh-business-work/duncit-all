import { z } from 'zod';

import type { AccountMe, UpdateProfileInput } from '@/hooks/useAccount';

/**
 * Edit-profile contract — mirrors mWeb's account-edit schema so both apps
 * validate identical rules (name required, optional contact/location fields,
 * digit-only phone numbers).
 */
const phone = z.string().trim().regex(/^\d*$/, 'Digits only').max(15, 'Too long');

const extension = z
  .string()
  .trim()
  .regex(/^\+?\d*$/, 'Use a code like +91')
  .max(5, 'Too long');

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Optional birth date — empty (no change) or a valid past YYYY-MM-DD (bug 8). */
const dob = z
  .string()
  .trim()
  .refine((value) => value === '' || DOB_PATTERN.test(value), 'Use the format YYYY-MM-DD')
  .refine((value) => {
    if (!value || !DOB_PATTERN.test(value)) return true;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  }, 'Enter a valid past date');

/** ISO/date string → the YYYY-MM-DD the date field expects (empty when unset). */
export function toDobInput(value?: string | null): string {
  if (!value) return '';
  return DOB_PATTERN.test(value.slice(0, 10)) ? value.slice(0, 10) : '';
}

export const accountEditSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(60, 'Too long'),
  last_name: z.string().trim().max(60, 'Too long'),
  bio: z.string().trim().max(280, 'Keep it under 280 characters'),
  dob,
  country: z.string().trim().max(80, 'Too long'),
  state: z.string().trim().max(80, 'Too long'),
  city: z.string().trim().max(80, 'Too long'),
  phone_extension: extension,
  phone_number: phone,
  whatsapp_extension: extension,
  whatsapp_number: phone,
  address_line1: z.string().trim().max(200, 'Too long'),
  address_line2: z.string().trim().max(200, 'Too long'),
  address_landmark: z.string().trim().max(160, 'Too long'),
  address_city: z.string().trim().max(120, 'Too long'),
  address_state: z.string().trim().max(120, 'Too long'),
  address_pincode: z.string().trim().max(10, 'Too long'),
  address_country: z.string().trim().max(80, 'Too long'),
});

export type AccountEditValues = z.infer<typeof accountEditSchema>;

/** Build the form's initial values from the loaded user (empty-string safe). */
export function accountEditDefaults(me: AccountMe | null): AccountEditValues {
  return {
    first_name: me?.first_name ?? '',
    last_name: me?.last_name ?? '',
    bio: me?.bio ?? '',
    dob: toDobInput(me?.dob),
    country: me?.country ?? '',
    state: me?.state ?? '',
    city: me?.city ?? '',
    phone_extension: me?.phone_extension ?? '+91',
    phone_number: me?.phone_number ?? '',
    whatsapp_extension: me?.whatsapp_extension ?? '+91',
    whatsapp_number: me?.whatsapp_number ?? '',
    address_line1: me?.address?.line1 ?? '',
    address_line2: me?.address?.line2 ?? '',
    address_landmark: me?.address?.landmark ?? '',
    address_city: me?.address?.city ?? '',
    address_state: me?.address?.state ?? '',
    address_pincode: me?.address?.pincode ?? '',
    address_country: me?.address?.country ?? '',
  };
}

/** Map validated form values to the GraphQL UpdateMyProfileInput. */
export function toUpdateProfileInput(values: AccountEditValues): UpdateProfileInput {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    bio: values.bio,
    dob: values.dob || undefined,
    country: values.country,
    state: values.state,
    city: values.city,
    phone_extension: values.phone_extension,
    phone_number: values.phone_number,
    whatsapp_extension: values.whatsapp_extension,
    whatsapp_number: values.whatsapp_number,
    address: {
      line1: values.address_line1,
      line2: values.address_line2,
      landmark: values.address_landmark,
      city: values.address_city,
      state: values.address_state,
      pincode: values.address_pincode,
      country: values.address_country,
    },
  };
}
