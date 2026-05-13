import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';
import type { CreateForm } from '../helpers';

export const createUserSchema: yup.ObjectSchema<CreateForm> = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: validationRules.personName('Last name'),
  email: validationRules.optionalEmail('Email'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone number'),
  password: yup.string().min(8, 'Min 8 characters').max(128).required('Password is required'),
  dob: yup
    .string()
    .required('Date of birth is required')
    .test('valid-date', 'Enter a valid date of birth', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }),
  roles: yup.array(yup.string().required()).min(1, 'At least one role is required').required(),
  city: validationRules.optionalText('City', 80),
  zone: validationRules.optionalText('Zone', 80),
});

export function toCreateUserInput(values: CreateForm) {
  const cast = createUserSchema.cast(values, { stripUnknown: true });
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
