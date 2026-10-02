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

export async function validateHostStep(step: number, s1: HostStep1, s2: HostStep2, s3: HostStep3) {
  try {
    if (step === 0) await hostStep1Schema.parseAsync(s1);
    if (step === 1) await hostStep2Schema.parseAsync(s2);
    if (step === 2) await hostStep3Schema.parseAsync(s3);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Check required fields';
    return 'Check required fields';
  }
}
