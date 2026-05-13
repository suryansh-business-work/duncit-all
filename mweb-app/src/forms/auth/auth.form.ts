import * as yup from 'yup';
import { validationRules } from '../validation/rules';

const locationName = (label: string) =>
  yup
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(80, `${label} must be 80 characters or fewer`)
    .required(`${label} is required`);

export const registerSchema = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: validationRules.personName('Last name'),
  email: validationRules.email('Email'),
  phone_number: validationRules.phoneNumber('Phone number'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  password: yup.string().min(8, 'Min 8 characters').max(128).required('Password is required'),
  dob: validationRules.birthDate('Birth year'),
  city: locationName('City'),
  zone: locationName('Zone'),
});

export const loginSchema = yup.object({
  email: validationRules.email('Email'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
});

export const googleSignupSchema = yup.object({
  phone_number: validationRules.phoneNumber('Phone number'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  dob: validationRules.birthDate('Birth year'),
  city: locationName('City'),
  zone: locationName('Zone'),
});

export const whatsAppOtpRequestSchema = yup.object({
  phone_extension: validationRules.phoneExtension('Code'),
  phone_number: validationRules.phoneNumber('WhatsApp number'),
});

export const whatsAppOtpVerifySchema = yup.object({
  otp: validationRules.otp(),
});
