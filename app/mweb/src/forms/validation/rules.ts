import { z } from 'zod';
import { zodRules } from '@duncit/forms';
import { DIAL_CODE, EMAIL, OTP_6, PERSON_NAME, PHONE_INTL } from '@duncit/regex';

/*
  Re-exported, not re-declared: @duncit/regex is the one place a name, a phone
  number, a dial code and a one-time code are described (rule 40). The shapes
  that stood here were a second opinion on all four — the name one even allowed
  a hyphen the signup box refuses, so the same person could be accepted here and
  turned away there.

  POSTAL_CODE_PATTERN has no twin in the package (it is alphanumeric, for
  non-Indian postcodes) and stays declared.
*/
export const PERSON_NAME_PATTERN = PERSON_NAME;
export const PHONE_NUMBER_PATTERN = PHONE_INTL;
export const PHONE_EXTENSION_PATTERN = DIAL_CODE;
export const OTP_PATTERN = OTP_6;
export const POSTAL_CODE_PATTERN = /^[\dA-Za-z -]{3,12}$/;

// @duncit/forms owns both optional rules; here a missing value has always meant ''.
const optionalText = (label: string, max: number) => zodRules.optionalText(label, max, { defaultEmpty: true });

// Not zodRules.requiredText: that one has no message for a missing value.
const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalUrl = (label: string, allowRelative = false) =>
  zodRules.optionalUrl(label, allowRelative, { defaultEmpty: true });

const birthDate = (label = 'Birth year') =>
  z
    .date({ error: `${label} is required` })
    .max(new Date(), `${label} must be in the past`)
    .refine((value) => {
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 13);
      return value <= minDate;
    }, 'You must be at least 13 years old');

export const validationRules = {
  personName: (label: string) =>
    z
      .string({ error: `${label} is required` })
      .trim()
      .regex(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes and periods only`),
  optionalText,
  requiredText,
  email: (label = 'Email') => {
    const required = `${label} is required`;
    return z
      .string({ error: (issue) => (issue.code === 'invalid_type' ? required : undefined) })
      .trim()
      .toLowerCase()
      .refine((value) => !value || EMAIL.test(value), `Enter a valid ${label.toLowerCase()}`)
      .max(254)
      .min(1, required);
  },
  phoneNumber: (label = 'Phone number') =>
    z
      .string({ error: `${label} is required` })
      .trim()
      .regex(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`),
  phoneExtension: (label = 'Phone code') =>
    z.string({ error: `${label} is required` }).trim().regex(PHONE_EXTENSION_PATTERN, `${label} is invalid`),
  otp: () => z.string({ error: 'OTP is required' }).trim().regex(OTP_PATTERN, 'Enter the OTP we sent'),
  birthDate,
  optionalUrl,
};
