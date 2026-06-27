import { z } from 'zod';
import { zodRules } from '../../../forms/validation/zodRules';
import type { CreateForm } from '../helpers';

const isValidPastDate = (value: string) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
};

export const createUserSchema = z.object({
  first_name: zodRules.personName('First name'),
  last_name: zodRules.personName('Last name'),
  email: zodRules.optionalEmail('Email'),
  phone_extension: zodRules.phoneExtension('Phone code'),
  phone_number: zodRules.phoneNumber('Phone number'),
  password: z.string().min(1, 'Password is required').min(8, 'Min 8 characters').max(128),
  dob: z.string().min(1, 'Date of birth is required').refine(isValidPastDate, 'Enter a valid date of birth'),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  city: zodRules.optionalText('City', 80),
  zone: zodRules.optionalText('Zone', 80),
});

export function toCreateUserInput(values: CreateForm) {
  const cast = createUserSchema.parse(values);
  return {
    first_name: cast.first_name,
    last_name: cast.last_name,
    email: cast.email || undefined,
    phone_extension: cast.phone_extension,
    phone_number: cast.phone_number,
    password: cast.password,
    dob: new Date(cast.dob).toISOString(),
    roles: cast.roles,
    city: cast.city || undefined,
    zone: cast.zone || undefined,
  };
}
