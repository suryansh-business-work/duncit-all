import { z } from 'zod';
import { zodRules } from '../../../forms/validation/zodRules';
import type { EditForm } from '../queries';

const PINCODE_PATTERN = /^[0-9A-Za-z -]{3,12}$/;

export const userProfileSchema: z.ZodType<EditForm, z.ZodTypeDef, unknown> = z.object({
  first_name: zodRules.personName('First name'),
  last_name: zodRules.personName('Last name'),
  email: zodRules.optionalEmail('Email').default(''),
  phone_extension: zodRules.phoneExtension('Phone code'),
  phone_number: zodRules.phoneNumber('Phone number'),
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

export function toUpdateUserInput(values: EditForm) {
  const cast = userProfileSchema.parse(values);
  const input: any = {
    first_name: cast.first_name,
    last_name: cast.last_name,
    phone_extension: cast.phone_extension,
    phone_number: cast.phone_number,
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
  if (cast.email) input.email = cast.email;
  return input;
}
