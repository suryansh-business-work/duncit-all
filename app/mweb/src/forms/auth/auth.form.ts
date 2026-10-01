import { z } from 'zod';
import { validationRules } from '../validation/rules';

const locationName = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(80, `${label} must be 80 characters or fewer`);

export const googleSignupSchema = z.object({
  phone_number: validationRules.phoneNumber('Phone number'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  dob: validationRules.birthDate('Birth year'),
  city: locationName('City'),
  zone: locationName('Zone'),
});
