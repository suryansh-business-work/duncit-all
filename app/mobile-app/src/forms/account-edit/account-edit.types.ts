import { z } from 'zod';
import { PERSON_NAME, PHONE_NUMBER, PINCODE } from '@duncit/regex';
import { USERNAME_PATTERN, normalizeUsername } from '@duncit/utils';
import {
  DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  FALLBACK_DATE_FORMAT,
  dobMinAgeMessage,
  isEligibleDob,
  patternPlaceholder,
} from '@duncit/datetime';

import { fallbackT, type Translate } from '@/i18n/fallback';

import type { AccountMe, UpdateProfileInput } from '@/hooks/useAccount';

/**
 * Edit-profile contract — mirrors mWeb's account-edit schema so both apps
 * validate identical rules (name required, optional contact/location fields,
 * a proper 10-digit phone number). Regex patterns are the shared @duncit/regex.
 */
const phone = z
  .string()
  .trim()
  .refine((value) => value === '' || PHONE_NUMBER.test(value), 'Enter a 10-digit phone number');

const extension = z
  .string()
  .trim()
  .regex(/^\+?\d*$/, 'Use a code like +91')
  .max(5, 'Too long');

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Optional birth date — empty (no change) or a YYYY-MM-DD that clears the
 * admin-configured minimum age. Same rule and message as mWeb and signup, from
 * @duncit/datetime, so a profile edit cannot walk around the joining age. */
const makeDob = (minAge: number, initialDob: string, datePlaceholder: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || DOB_PATTERN.test(value), `Use the format ${datePlaceholder}`)
    .refine((value) => {
      if (!value || !DOB_PATTERN.test(value)) return true;
      // A stored date the user has not touched is grandfathered: tightening the
      // age rule must not brick an existing profile, it only gates a NEW pick.
      if (initialDob && value === initialDob) return true;
      return isEligibleDob(value, minAge);
    }, dobMinAgeMessage(minAge));

/** ISO/date string → the YYYY-MM-DD the date field expects (empty when unset). */
export function toDobInput(value?: string | null): string {
  if (!value) return '';
  return DOB_PATTERN.test(value.slice(0, 10)) ? value.slice(0, 10) : '';
}

export const makeAccountEditSchema = (
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  initialDob = '',
  /** How the date box asks to be typed, from the admin's date pattern. */
  datePlaceholder: string = patternPlaceholder(FALLBACK_DATE_FORMAT),
  /** Translator for the copy this schema fails with. */
  t: Translate = fallbackT,
) =>
  z.object({
    /**
     * The @handle, shaped by the pattern the server re-checks in `username.ts`,
     * so the field cannot hold one `setMyUsername` would then refuse. No
     * message: the status line under the field is localized copy from
     * `buildUsernameLabels` (rule 38), and a second English sentence here is
     * the one that would drift. Empty is allowed for an account minted before
     * handles existed.
     */
    username: z
      .string()
      .refine((value) => value === '' || USERNAME_PATTERN.test(normalizeUsername(value))),
    // Both name boxes take the shared PERSON_NAME shape — letters, spaces,
    // apostrophes and periods. Digits, underscores, emoji and any other
    // punctuation are rejected here exactly as they are at signup and on mWeb.
    first_name: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(60, 'Too long')
      .refine(
        (value) => PERSON_NAME.test(value),
        t('mweb.accountEdit.validation.firstNamePattern'),
      ),
    last_name: z
      .string()
      .trim()
      .max(60, 'Too long')
      .refine(
        (value) => value === '' || PERSON_NAME.test(value),
        t('mweb.accountEdit.validation.lastNamePattern'),
      ),
    bio: z.string().trim().max(280, 'Keep it under 280 characters'),
    dob: makeDob(minAge, initialDob, datePlaceholder),
    country: z.string().trim().max(80, 'Too long'),
    state: z.string().trim().max(80, 'Too long'),
    city: z.string().trim().max(80, 'Too long'),
    phone_extension: extension,
    phone_number: phone,
    whatsapp_extension: extension,
    whatsapp_number: phone,
    address_line1: z.string().trim().max(200, 'Too long'),
    address_line2: z.string().trim().max(200, 'Too long'),
    address_landmark: z.string().trim().max(160, 'Too long'),
    address_city: z.string().trim().max(120, 'Too long'),
    address_state: z.string().trim().max(120, 'Too long'),
    address_pincode: z
      .string()
      .trim()
      .refine((value) => value === '' || PINCODE.test(value), 'Enter a valid 6-digit pincode'),
    address_country: z.string().trim().max(80, 'Too long'),
  });

/** Default-threshold schema — for callers with no settings context (tests). */
export const accountEditSchema = makeAccountEditSchema();

export type AccountEditValues = z.infer<typeof accountEditSchema>;

/** Build the form's initial values from the loaded user (empty-string safe). */
export function accountEditDefaults(me: AccountMe | null): AccountEditValues {
  return {
    username: me?.username ?? '',
    first_name: me?.first_name ?? '',
    last_name: me?.last_name ?? '',
    bio: me?.bio ?? '',
    dob: toDobInput(me?.dob),
    country: me?.country ?? '',
    state: me?.state ?? '',
    city: me?.city ?? '',
    phone_extension: me?.phone_extension ?? '+91',
    phone_number: me?.phone_number ?? '',
    whatsapp_extension: me?.whatsapp_extension ?? '+91',
    whatsapp_number: me?.whatsapp_number ?? '',
    address_line1: me?.address?.line1 ?? '',
    address_line2: me?.address?.line2 ?? '',
    address_landmark: me?.address?.landmark ?? '',
    address_city: me?.address?.city ?? '',
    address_state: me?.address?.state ?? '',
    address_pincode: me?.address?.pincode ?? '',
    address_country: me?.address?.country ?? '',
  };
}

/** Map validated form values to the GraphQL UpdateMyProfileInput. */
export function toUpdateProfileInput(values: AccountEditValues): UpdateProfileInput {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    bio: values.bio,
    dob: values.dob || undefined,
    country: values.country,
    state: values.state,
    city: values.city,
    phone_extension: values.phone_extension,
    phone_number: values.phone_number,
    whatsapp_extension: values.whatsapp_extension,
    whatsapp_number: values.whatsapp_number,
    address: {
      line1: values.address_line1,
      line2: values.address_line2,
      landmark: values.address_landmark,
      city: values.address_city,
      state: values.address_state,
      pincode: values.address_pincode,
      country: values.address_country,
    },
  };
}
