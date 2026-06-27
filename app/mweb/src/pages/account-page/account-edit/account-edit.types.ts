import { z } from 'zod';
import { PERSON_NAME_PATTERN } from '../../../forms/validation/rules';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^\d{6,15}$/;
const EXT_PATTERN = /^\+?\d{1,5}$/;

const optionalPersonName = (label: string) =>
  z
    .string()
    .trim()
    .max(60, `${label} must be 60 characters or fewer`)
    .refine((v) => v === '' || PERSON_NAME_PATTERN.test(v), {
      message: `${label} can use letters, spaces, apostrophes, periods and hyphens only`,
    });

const optionalLocation = (label: string) =>
  z.string().trim().max(80, `${label} must be 80 characters or fewer`);

/** Optional full birth date — empty (no change) or a valid past YYYY-MM-DD. */
const dob = z
  .string()
  .trim()
  .refine((v) => v === '' || DOB_PATTERN.test(v), 'Use the format YYYY-MM-DD')
  .refine((v) => {
    if (!v || !DOB_PATTERN.test(v)) return true;
    const parsed = new Date(v);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  }, 'Enter a valid past date');

const phone = z
  .string()
  .trim()
  .refine((v) => v === '' || PHONE_PATTERN.test(v), 'Enter 6–15 digits');

const extension = z
  .string()
  .trim()
  .refine((v) => v === '' || EXT_PATTERN.test(v), 'Use a code like +91');

/**
 * Edit-profile contract — RHF + Zod (migrated from Formik + Yup, rule 10).
 * Mirrored field-for-field by the mobile app so both validate identical rules.
 * `zone` was dropped (bug 14); `state` was added for the dependent location
 * dropdowns (bug 2).
 */
export const accountEditSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(60, 'First name must be 60 characters or fewer')
    .refine((v) => PERSON_NAME_PATTERN.test(v), {
      message: 'First name can use letters, spaces, apostrophes, periods and hyphens only',
    }),
  last_name: optionalPersonName('Last name'),
  bio: z.string().trim().max(500, 'Bio must be 500 characters or fewer'),
  dob,
  country: optionalLocation('Country'),
  state: optionalLocation('State'),
  city: optionalLocation('City'),
  phone_extension: extension,
  phone_number: phone,
  whatsapp_extension: extension,
  whatsapp_number: phone,
});

export type AccountEditValues = z.infer<typeof accountEditSchema>;

/** ISO/date string → the YYYY-MM-DD value the date picker initialises with. */
export function toDobInput(value?: string | null): string {
  if (!value) return '';
  return DOB_PATTERN.test(value.slice(0, 10)) ? value.slice(0, 10) : '';
}

/** Build the form's initial values from the loaded user (empty-string safe). */
export function accountEditDefaults(initial: Partial<AccountEditValues>): AccountEditValues {
  return {
    first_name: '',
    last_name: '',
    bio: '',
    dob: '',
    country: '',
    state: '',
    city: '',
    phone_extension: '+91',
    phone_number: '',
    whatsapp_extension: '+91',
    whatsapp_number: '',
    ...initial,
  };
}

/** Map validated form values to the GraphQL UpdateMyProfileInput. */
export function toUpdateProfileInput(values: AccountEditValues) {
  const input = {
    first_name: values.first_name,
    last_name: values.last_name,
    bio: values.bio,
    country: values.country,
    state: values.state,
    city: values.city,
    phone_extension: values.phone_extension,
    phone_number: values.phone_number,
    whatsapp_extension: values.whatsapp_extension,
    whatsapp_number: values.whatsapp_number,
    dob: values.dob,
  };
  // Omit an empty dob so saving the form doesn't wipe an existing birth date.
  if (!input.dob) delete (input as { dob?: string }).dob;
  return input;
}
