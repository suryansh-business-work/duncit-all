import { z } from 'zod';
import { zodRules } from '@duncit/forms';
import type { EditForm } from '../queries';

const PINCODE_PATTERN = /^[0-9A-Za-z -]{3,12}$/;

export const userProfileSchema = z.object({
  first_name: zodRules.personName('First name'),
  last_name: zodRules.personName('Last name'),
  email: zodRules.optionalEmail('Email').default(''),
  // Optional, not required. Phone has never been collected at signup, so an
  // account without one is ordinary — and a required rule here left Save
  // disabled for every one of them, which is what looked like a broken page.
  phone_extension: zodRules.optionalPhoneExtension('Phone code'),
  phone_number: zodRules.optionalPhoneNumber('Phone number'),
  whatsapp_extension: zodRules.optionalPhoneExtension('WhatsApp code'),
  whatsapp_number: zodRules.optionalPhoneNumber('WhatsApp number'),
  city: zodRules.optionalText('City', 80).default(''),
  state: zodRules.optionalText('State', 80).default(''),
  pincode: z
    .string()
    .trim()
    .default('')
    .refine(
      (value) => value === '' || PINCODE_PATTERN.test(value),
      'Pincode must be 3–12 letters, digits, spaces or hyphens',
    ),
  zone: zodRules.optionalText('Zone', 80).default(''),
  assigned_city: zodRules.optionalText('Assigned city', 80).default(''),
  assigned_zones: zodRules.optionalText('Assigned zones', 500).default(''),
  bio: zodRules.optionalText('Bio', 500).default(''),
  profile_photo: zodRules.optionalText('Profile photo URL', 1000).default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
});

/**
 * Map the form onto UpdateUserInput.
 *
 * The three contact fields are sent whatever they hold, blank included: the
 * server reads '' as "clear it", and omitting them the way the optional
 * location fields are omitted would turn an emptied box into a silent no-op
 * the admin could never explain.
 */
export function toUpdateUserInput(values: EditForm) {
  const cast = userProfileSchema.parse(values);
  const input: any = {
    first_name: cast.first_name,
    last_name: cast.last_name,
    email: cast.email,
    phone_extension: cast.phone_extension,
    phone_number: cast.phone_number,
    whatsapp_extension: cast.whatsapp_extension,
    whatsapp_number: cast.whatsapp_number,
    city: cast.city || undefined,
    state: cast.state || undefined,
    pincode: cast.pincode || undefined,
    zone: cast.zone || undefined,
    assigned_city: cast.assigned_city || undefined,
    assigned_zones: cast.assigned_zones
      ? cast.assigned_zones.split(',').map((zone) => zone.trim()).filter(Boolean)
      : [],
    bio: cast.bio || undefined,
    profile_photo: cast.profile_photo || undefined,
    status: cast.status,
  };
  return input;
}
