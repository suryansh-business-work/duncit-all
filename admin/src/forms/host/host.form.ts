import * as yup from 'yup';
import { AADHAR_PATTERN, PAN_PATTERN, validationRules } from '../validation/rules';
import {
  bankAccountSchema,
  blankBankAccountValues,
  normalizeBankAccountValues,
} from '../validation/bankAccount';

const hostPhone = yup
  .string()
  .trim()
  .matches(/^\+?\d{6,15}$/, 'Phone must contain only digits with an optional + prefix')
  .required('Phone is required');

const hostDob = yup
  .string()
  .trim()
  .default('')
  .test('dob', 'Enter a valid date of birth', (value) => {
    if (!value) return true;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date <= new Date();
  });

export const hostStep1Schema = yup.object({
  full_name: validationRules.personName('Full name'),
  email: validationRules.email('Email'),
  phone: hostPhone,
  dob: hostDob,
});

export const hostStep2Schema = yup.object({
  aadhar_number: yup
    .string()
    .trim()
    .matches(AADHAR_PATTERN, 'Aadhar must be a 12 digit number')
    .required('Aadhar is required'),
  pan_number: yup
    .string()
    .trim()
    .uppercase()
    .matches(PAN_PATTERN, 'PAN must use format ABCDE1234F')
    .required('PAN is required'),
  passport_photo_url: validationRules.requiredText('Passport photo', 1, 1000),
});

export const hostStep3Schema = yup.object({
  police_verification_url: validationRules.requiredText('Police verification', 1, 1000),
  full_address: validationRules.requiredText('Address', 5, 500),
  bank_account: bankAccountSchema,
  tags: yup.array(yup.string().trim().max(40)).default([]),
});

export const hostEditSchema = yup.object({
  step1: hostStep1Schema,
  step2: hostStep2Schema,
  step3: hostStep3Schema,
  status: yup
    .mixed<'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>()
    .oneOf(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], 'Select a valid status')
    .required('Status is required'),
});

export const hostCreateSchema = yup.object({
  target_user_id: yup.string().trim().required('Select a user'),
  step1: hostStep1Schema,
  step2: hostStep2Schema,
  step3: hostStep3Schema,
});

export type HostEditValues = yup.InferType<typeof hostEditSchema>;
export type HostCreateValues = yup.InferType<typeof hostCreateSchema>;

const dateOnly = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

export function hostEditInitialValues(host: any | null): HostEditValues {
  return {
    step1: {
      full_name: host?.full_name ?? '',
      email: host?.email ?? '',
      phone: host?.phone ?? '',
      dob: dateOnly(host?.dob),
    },
    step2: {
      aadhar_number: host?.aadhar_number ?? '',
      pan_number: host?.pan_number ?? '',
      passport_photo_url: host?.passport_photo_url ?? '',
    },
    step3: {
      police_verification_url: host?.police_verification_url ?? '',
      full_address: host?.full_address ?? '',
      bank_account: normalizeBankAccountValues(host?.bank_account),
      tags: host?.tags ?? [],
    },
    status: host?.status ?? 'APPROVED',
  } as HostEditValues;
}

export function toHostEditVariables(values: HostEditValues) {
  const cast = hostEditSchema.cast(values, { stripUnknown: true });
  return {
    step1: cast.step1,
    step2: cast.step2,
    step3: cast.step3,
    status: cast.status,
  };
}

export const hostCreateInitialValues: HostCreateValues = {
  target_user_id: '',
  step1: { full_name: '', email: '', phone: '', dob: '' },
  step2: { aadhar_number: '', pan_number: '', passport_photo_url: '' },
  step3: { police_verification_url: '', full_address: '', bank_account: blankBankAccountValues(), tags: [] },
};

export function toHostCreateVariables(values: HostCreateValues, submit: boolean) {
  const cast = hostCreateSchema.cast(values, { stripUnknown: true });
  return {
    target_user_id: cast.target_user_id,
    step1: cast.step1,
    step2: cast.step2,
    step3: cast.step3,
    submit,
  };
}
