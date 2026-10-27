import { z } from 'zod';
import { AADHAR_PATTERN, PAN_PATTERN } from '@duncit/forms';
import { validationRules } from '../../forms/validation/rules';
import { HOST_DOB_RANGE_ERROR, isValidHostDob } from '../../utils/hostDob';
import type { HostStep1, HostStep2, HostStep3 } from './types';

/** A missing value and a blank one are refused with the same message. */
const requiredString = (message: string) => z.string({ error: message }).trim().min(1, message);

export const hostStep1Schema: z.ZodType<HostStep1> = z.object({
  full_name: validationRules.personName('Full name'),
  email: validationRules.email('Email'),
  phone: validationRules.phoneNumber('Phone'),
  dob: z.string().default('').refine(isValidHostDob, HOST_DOB_RANGE_ERROR),
});

export const hostStep2Schema: z.ZodType<HostStep2> = z.object({
  aadhar_number: z.string({ error: 'Aadhar is required' }).trim().regex(AADHAR_PATTERN, 'Aadhar must be 12 digits'),
  pan_number: z.string({ error: 'PAN is required' }).trim().toUpperCase().regex(PAN_PATTERN, 'PAN must follow format ABCDE1234F'),
  passport_photo_url: requiredString('Passport-size photo is required'),
});

export const hostStep3Schema: z.ZodType<HostStep3> = z.object({
  police_verification_url: requiredString('Police verification is required'),
  full_address: validationRules.requiredText('Full address', 6, 500),
});

/** The first message the step's schema refuses with, or null when the step is fine (the final step has no fields). */
export async function validateHostStep(step: number, s1: HostStep1, s2: HostStep2, s3: HostStep3) {
  const checks = [
    () => hostStep1Schema.safeParseAsync(s1),
    () => hostStep2Schema.safeParseAsync(s2),
    () => hostStep3Schema.safeParseAsync(s3),
  ];
  const result = await checks[step]?.();
  return result && !result.success ? result.error.issues[0].message : null;
}
