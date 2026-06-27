import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';
import type { EditForm } from '../queries';

export const userProfileSchema: yup.ObjectSchema<EditForm> = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: validationRules.personName('Last name'),
  email: validationRules.optionalEmail('Email'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone number'),
  city: validationRules.optionalText('City', 80),
  state: validationRules.optionalText('State', 80),
  pincode: yup
    .string()
    .trim()
    .matches(/^[0-9A-Za-z -]{3,12}$/, {
      message: 'Pincode must be 3–12 letters, digits, spaces or hyphens',
      excludeEmptyString: true,
    })
    .default(''),
  zone: validationRules.optionalText('Zone', 80),
  assigned_city: validationRules.optionalText('Assigned city', 80),
  assigned_zones: validationRules.optionalText('Assigned zones', 500),
  bio: validationRules.optionalText('Bio', 500),
  profile_photo: validationRules.optionalText('Profile photo URL', 1000),
  status: yup
    .mixed<EditForm['status']>()
    .oneOf(['ACTIVE', 'INACTIVE', 'SUSPENDED'], 'Select a valid status')
    .required('Status is required'),
});

export function toUpdateUserInput(values: EditForm) {
  const cast = userProfileSchema.cast(values, { stripUnknown: true });
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
