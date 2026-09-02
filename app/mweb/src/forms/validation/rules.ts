import * as yup from 'yup';
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

const optionalText = (label: string, max: number) =>
  yup.string().trim().max(max, `${label} must be ${max} characters or fewer`).default('');

const requiredText = (label: string, min: number, max: number) =>
  yup
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .required(`${label} is required`);

const optionalUrl = (label: string, allowRelative = false) =>
  yup
    .string()
    .trim()
    .default('')
    .test('url', `${label} must be a valid URL`, (value) => {
      if (!value) return true;
      if (allowRelative && /^\/[\w./?=&%#:+-]*$/.test(value)) return true;
      try {
        const parsed = new URL(value);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    });

const birthDate = (label = 'Birth year') =>
  yup
    .date()
    .typeError(`${label} is required`)
    .max(new Date(), `${label} must be in the past`)
    .test('minimum-age', 'You must be at least 13 years old', (value) => {
      if (!value) return false;
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 13);
      return value <= minDate;
    })
    .required(`${label} is required`);

export const validationRules = {
  personName: (label: string) =>
    yup
      .string()
      .trim()
      .matches(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes and periods only`)
      .required(`${label} is required`),
  optionalText,
  requiredText,
  email: (label = 'Email') =>
    yup
      .string()
      .trim()
      .lowercase()
      .test('email', `Enter a valid ${label.toLowerCase()}`, (value) => !value || EMAIL.test(value))
      .max(254)
      .required(`${label} is required`),
  phoneNumber: (label = 'Phone number') =>
    yup.string().trim().matches(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`).required(`${label} is required`),
  phoneExtension: (label = 'Phone code') =>
    yup.string().trim().matches(PHONE_EXTENSION_PATTERN, `${label} is invalid`).required(`${label} is required`),
  otp: () => yup.string().trim().matches(OTP_PATTERN, 'Enter the OTP we sent').required('OTP is required'),
  birthDate,
  optionalUrl,
};