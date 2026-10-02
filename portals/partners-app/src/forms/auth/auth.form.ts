import { z } from 'zod';
import { validationRules } from '../validation/rules';

const locationName = (label: string) => validationRules.requiredText(label, 2, 80);

export const registerSchema = z.object({
  first_name: validationRules.personName('First name'),
  last_name: validationRules.personName('Last name'),
  email: validationRules.email('Email'),
  phone_number: validationRules.phoneNumber('Phone number'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  // Piped so the length cap reports its own message rather than the required one.
  password: z.string({ error: 'Password is required' }).min(8, 'Min 8 characters').pipe(z.string().max(128)),
  dob: validationRules.birthDate('Birth year'),
  city: locationName('City'),
  zone: locationName('Zone'),
});

export const loginSchema = z.object({
  email: validationRules.email('Email'),
  password: z.string({ error: 'Password is required' }).min(8, 'Min 8 characters'),
});

export const googleSignupSchema = z.object({
  phone_number: validationRules.phoneNumber('Phone number'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  dob: validationRules.birthDate('Birth year'),
  city: locationName('City'),
  zone: locationName('Zone'),
});

export const whatsAppOtpRequestSchema = z.object({
  phone_extension: validationRules.phoneExtension('Code'),
  phone_number: validationRules.phoneNumber('WhatsApp number'),
});

export const whatsAppOtpVerifySchema = z.object({
  otp: validationRules.otp(),
});
