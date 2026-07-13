import { z } from 'zod';
import { AADHAR_PATTERN, PAN_PATTERN, PERSON_NAME_PATTERN } from '../validation/rules';
import { blankBankAccountValues, normalizeBankAccountValues } from '../validation/bankAccount';
import type { BankAccountValues } from '../validation/bankAccount';
import { castHostBankAccount, hostBankAccountSchema } from './host-bank-account';
import { HOST_DOB_RANGE_ERROR, isValidHostDob } from '../../utils/hostDob';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

const hostFullName = z
  .string()
  .trim()
  .min(1, 'Full name is required')
  .regex(PERSON_NAME_PATTERN, 'Full name can use letters, spaces, apostrophes, periods and hyphens only');

const hostEmail = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z.string().min(1, 'Email is required').max(254).regex(EMAIL_PATTERN, 'Enter a valid email'),
  );

const hostPhone = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .regex(/^\+?\d{6,15}$/, 'Phone must contain only digits with an optional + prefix');

const hostDob = z
  .string()
  .trim()
  .default('')
  .refine(isValidHostDob, HOST_DOB_RANGE_ERROR);

export const hostStep1Schema = z.object({
  full_name: hostFullName,
  email: hostEmail,
  phone: hostPhone,
  dob: hostDob,
});

export const hostStep2Schema = z.object({
  aadhar_number: z
    .string()
    .trim()
    .min(1, 'Aadhar is required')
    .regex(AADHAR_PATTERN, 'Aadhar must be a 12 digit number'),
  pan_number: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().min(1, 'PAN is required').regex(PAN_PATTERN, 'PAN must use format ABCDE1234F')),
  passport_photo_url: requiredText('Passport photo', 1, 1000),
});

export const hostStep3Schema = z.object({
  police_verification_url: requiredText('Police verification', 1, 1000),
  full_address: requiredText('Address', 5, 500),
  bank_account: hostBankAccountSchema,
  tags: z.array(z.string().trim().max(40)).default([]),
});

const hostStatus = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], {
  errorMap: () => ({ message: 'Select a valid status' }),
});

/** One category a host operates in. Ids drive the save; names + request_no are
 * carried for display (request_no marks a category the host requested). */
export const hostCategorySchema = z.object({
  super_category_id: z.string().trim().min(1),
  category_id: z.string().trim().min(1),
  sub_category_id: z.string().trim().min(1),
  super_category_name: z.string().default(''),
  category_name: z.string().default(''),
  sub_category_name: z.string().default(''),
  request_no: z.string().default(''),
});
export type HostCategoryValue = z.input<typeof hostCategorySchema>;

export const hostEditSchema = z.object({
  step1: hostStep1Schema,
  step2: hostStep2Schema,
  step3: hostStep3Schema,
  status: hostStatus,
  categories: z.array(hostCategorySchema).default([]),
});

export const hostCreateSchema = z.object({
  target_user_id: z.string().trim().min(1, 'Select a user'),
  step1: hostStep1Schema,
  step2: hostStep2Schema,
  step3: hostStep3Schema,
});

export type HostEditValues = z.input<typeof hostEditSchema>;
export type HostCreateValues = z.input<typeof hostCreateSchema>;

const dateOnly = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

export function hostEditInitialValues(host: any): HostEditValues {
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
    categories: (host?.host_categories ?? [])
      .filter((c: any) => c?.super_category_id && c?.category_id && c?.sub_category_id)
      .map((c: any) => ({
        super_category_id: String(c.super_category_id),
        category_id: String(c.category_id),
        sub_category_id: String(c.sub_category_id),
        super_category_name: c.super_category_name ?? '',
        category_name: c.category_name ?? '',
        sub_category_name: c.sub_category_name ?? '',
        request_no: c.request_no ?? '',
      })),
  };
}

type HostStepValues = Pick<HostCreateValues, 'step1' | 'step2' | 'step3'>;

const castStep1 = (values: HostStepValues) => hostStep1Schema.parse(values.step1);
const castStep2 = (values: HostStepValues) => hostStep2Schema.parse(values.step2);
const castStep3 = (values: HostStepValues) => {
  const step3 = hostStep3Schema.parse(values.step3);
  return { ...step3, bank_account: castHostBankAccount(step3.bank_account as BankAccountValues) };
};

export function toHostEditVariables(values: HostEditValues) {
  return {
    step1: castStep1(values),
    step2: castStep2(values),
    step3: castStep3(values),
    status: hostStatus.parse(values.status),
    // Server denormalizes names + preserves request_no; send ids only.
    categories: (values.categories ?? []).map((c) => ({
      super_category_id: c.super_category_id,
      category_id: c.category_id,
      sub_category_id: c.sub_category_id,
    })),
  };
}

export const hostCreateInitialValues: HostCreateValues = {
  target_user_id: '',
  step1: { full_name: '', email: '', phone: '', dob: '' },
  step2: { aadhar_number: '', pan_number: '', passport_photo_url: '' },
  step3: { police_verification_url: '', full_address: '', bank_account: blankBankAccountValues(), tags: [] },
};

export function toHostCreateVariables(values: HostCreateValues, submit: boolean) {
  return {
    target_user_id: values.target_user_id.trim(),
    step1: castStep1(values),
    step2: castStep2(values),
    step3: castStep3(values),
    submit,
  };
}
