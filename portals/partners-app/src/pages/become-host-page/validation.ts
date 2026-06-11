import * as yup from 'yup';
import { validationRules } from '../../forms/validation/rules';
import { HOST_DOB_RANGE_ERROR, isValidHostDob } from '../../utils/hostDob';
import type { HostStep1, HostStep2, HostStep3 } from './types';

const AADHAR_PATTERN = /^[0-9]{12}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const hostStep1Schema: yup.ObjectSchema<HostStep1> = yup.object({
  full_name: validationRules.personName('Full name'),
  email: validationRules.email('Email'),
  phone: validationRules.phoneNumber('Phone'),
  dob: yup.string().default('').test('valid-dob', HOST_DOB_RANGE_ERROR, isValidHostDob),
});

export const hostStep2Schema: yup.ObjectSchema<HostStep2> = yup.object({
  aadhar_number: yup.string().trim().matches(AADHAR_PATTERN, 'Aadhar must be 12 digits').required('Aadhar is required'),
  pan_number: yup.string().trim().uppercase().matches(PAN_PATTERN, 'PAN must follow format ABCDE1234F').required('PAN is required'),
  passport_photo_url: yup.string().trim().required('Passport-size photo is required'),
});

export const hostStep3Schema: yup.ObjectSchema<HostStep3> = yup.object({
  police_verification_url: yup.string().trim().required('Police verification is required'),
  full_address: validationRules.requiredText('Full address', 6, 500),
});

export async function validateHostStep(step: number, s1: HostStep1, s2: HostStep2, s3: HostStep3) {
  try {
    if (step === 0) await hostStep1Schema.validate(s1, { abortEarly: false });
    if (step === 1) await hostStep2Schema.validate(s2, { abortEarly: false });
    if (step === 2) await hostStep3Schema.validate(s3, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) return error.errors[0] ?? 'Check required fields';
    return 'Check required fields';
  }
}