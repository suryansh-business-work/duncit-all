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

export const accountEditSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(60, 'Too long'),
  last_name: z.string().trim().max(60, 'Too long'),
  bio: z.string().trim().max(280, 'Keep it under 280 characters'),
  city: z.string().trim().max(80, 'Too long'),
  zone: z.string().trim().max(80, 'Too long'),
  country: z.string().trim().max(80, 'Too long'),
  phone_extension: extension,
  phone_number: phone,
  whatsapp_extension: extension,
  whatsapp_number: phone,
});

export type AccountEditValues = z.infer<typeof accountEditSchema>;

/** Build the form's initial values from the loaded user (empty-string safe). */
export function accountEditDefaults(me: AccountMe | null): AccountEditValues {
  return {
    first_name: me?.first_name ?? '',
    last_name: me?.last_name ?? '',
    bio: me?.bio ?? '',
    city: me?.city ?? '',
    zone: me?.zone ?? '',
    country: me?.country ?? '',
    phone_extension: me?.phone_extension ?? '+91',
    phone_number: me?.phone_number ?? '',
    whatsapp_extension: me?.whatsapp_extension ?? '+91',
    whatsapp_number: me?.whatsapp_number ?? '',
  };
}

/** Map validated form values to the GraphQL UpdateMyProfileInput. */
export function toUpdateProfileInput(values: AccountEditValues): UpdateProfileInput {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    bio: values.bio,
    city: values.city,
    zone: values.zone,
    country: values.country,
    phone_extension: values.phone_extension,
    phone_number: values.phone_number,
    whatsapp_extension: values.whatsapp_extension,
    whatsapp_number: values.whatsapp_number,
  };
}
