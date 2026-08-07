import { z } from 'zod';
import { EMAIL, PHONE_INTL_PLUS } from '@duncit/regex';
import { GRIEVANCE_MAX_LENGTH } from '@duncit/utils';

/**
 * The Grievance Officer's published details.
 *
 * The lengths come from the shared grievance spec and the shapes from
 * @duncit/regex, so this form cannot accept something the server will reject —
 * the two are the same numbers and the same patterns, not two copies of them.
 */
export interface GrievanceOfficerFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/** Punctuation people actually type, checked on the digits alone. */
const phoneShape = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .max(GRIEVANCE_MAX_LENGTH.phone, 'Phone is too long')
  .refine((v) => PHONE_INTL_PLUS.test(v.replace(/[\s()-]/g, '')), 'Enter a valid phone number');

export const grievanceOfficerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(GRIEVANCE_MAX_LENGTH.name, 'Name is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(GRIEVANCE_MAX_LENGTH.email, 'Email is too long')
    .refine((v) => EMAIL.test(v), 'Enter a valid email address'),
  phone: phoneShape,
  // The one optional field — an officer is reachable without a postal address.
  address: z.string().trim().max(GRIEVANCE_MAX_LENGTH.address, 'Address is too long'),
});

export const EMPTY_GRIEVANCE_OFFICER: GrievanceOfficerFormValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
};
